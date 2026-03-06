import express from 'express';
import { supabase } from '../server.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

const isValidEmail = (email = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const donationsStorePath = path.resolve(__dirname, '../data/donations-store.json');
const adsStorePath = path.resolve(__dirname, '../data/advertise-store.json');

const readArrayStore = async (storePath) => {
  try {
    const raw = await fs.readFile(storePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeArrayStore = async (storePath, list) => {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(list, null, 2), 'utf-8');
};

router.post('/public/donation-intent', async (req, res) => {
  try {
    const amount = Number(req.body?.amount || 0);
    const contributorName = String(req.body?.contributorName || 'Supporter').trim();
    const purpose = String(req.body?.purpose || 'Platform support').trim();

    if (!Number.isFinite(amount) || amount < 100) {
      return res.status(400).json({ error: 'Minimum payment is ₹100' });
    }

    const finalAmount = Math.round(amount);
    const upiId = process.env.UPI_ID || 'justiceai@upi';
    const reference = `DON-${Date.now()}`;
    const note = `${purpose} | Ref: ${reference}`;
    const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent('JusticeAI')}&am=${finalAmount}&cu=INR&tn=${encodeURIComponent(note)}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiLink)}`;
    const createdAt = new Date().toISOString();

    try {
      const donations = await readArrayStore(donationsStorePath);
      donations.unshift({
        reference,
        amount: finalAmount,
        contributorName,
        purpose,
        upiId,
        createdAt,
      });
      await writeArrayStore(donationsStorePath, donations.slice(0, 300));

      await supabase.from('audit_logs').insert({
        action: 'donation_intent_created',
        resource_type: 'monetization_donation',
        changes: { reference, amount: finalAmount, contributorName, purpose, upiId, createdAt },
      });
    } catch (logError) {
      console.error('Donation intent log failed:', logError?.message || logError);
    }

    return res.status(201).json({
      success: true,
      reference,
      amount: finalAmount,
      upiId,
      upiLink,
      qrCodeUrl,
      message: 'Donation intent created. Complete payment using your UPI app.',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/public/advertise-intent', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim();
    const organization = String(req.body?.organization || '').trim();
    const budget = String(req.body?.budget || '').trim();
    const message = String(req.body?.message || '').trim();

    if (!name || !email || !organization || !message) {
      return res.status(400).json({ error: 'name, email, organization, and message are required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const inquiryId = `ADV-${Date.now()}`;
    const createdAt = new Date().toISOString();
    try {
      const adInquiries = await readArrayStore(adsStorePath);
      adInquiries.unshift({
        inquiryId,
        name,
        email,
        organization,
        budget,
        message,
        createdAt,
      });
      await writeArrayStore(adsStorePath, adInquiries.slice(0, 300));

      await supabase.from('audit_logs').insert({
        action: 'advertise_inquiry_created',
        resource_type: 'monetization_advertise',
        changes: { inquiryId, name, email, organization, budget, message, createdAt },
      });
    } catch (logError) {
      console.error('Advertisement inquiry log failed:', logError?.message || logError);
    }

    return res.status(201).json({
      success: true,
      inquiryId,
      message: 'Advertisement inquiry submitted. Our team will contact you.',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/public/donation-intents', async (req, res) => {
  try {
    const donations = await readArrayStore(donationsStorePath);
    return res.json({ success: true, donations: donations.slice(0, 20) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/public/advertise-intents', async (req, res) => {
  try {
    const adInquiries = await readArrayStore(adsStorePath);
    return res.json({ success: true, adInquiries: adInquiries.slice(0, 20) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
