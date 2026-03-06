import express from 'express';
import { supabase } from '../server.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import {
  createComplaintFeeIntent,
  confirmComplaintFee,
  getComplaintFeeByReference,
} from '../utils/complaintFeeStore.js';

const router = express.Router();

const isValidEmail = (email = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const donationsStorePath = path.resolve(__dirname, '../data/donations-store.json');
const adInquiriesStorePath = path.resolve(__dirname, '../data/advertise-store.json');
const adCampaignsStorePath = path.resolve(__dirname, '../data/ad-campaigns-store.json');

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

const getDefaultCampaigns = () => [
  {
    id: 'SPONSOR-LEGAL-1',
    sponsor: 'Nyaya Legal Aid Partners',
    title: 'Affordable Legal Consultation',
    description: 'Book first legal consultation for civic rights and complaint follow-up.',
    ctaLabel: 'Book Consultation',
    ctaUrl: 'https://nalsa.gov.in/',
    placement: 'homepage',
    imageUrl: '',
    isActive: true,
    startDate: '2026-01-01',
    endDate: '2027-12-31',
    createdAt: new Date().toISOString(),
  },
];

const nowIsoDate = () => new Date().toISOString().slice(0, 10);

router.post('/public/complaint-fee-intent', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim();
    const phone = String(req.body?.phone || '').trim();
    const amount = Number(req.body?.amount || 100);

    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'name, email and phone are required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (!Number.isFinite(amount) || amount < 100) {
      return res.status(400).json({ error: 'Minimum complaint filing fee is Rs 100' });
    }

    const upiId = process.env.UPI_ID || 'justiceai@upi';
    const intent = await createComplaintFeeIntent({ name, email, phone, amount, upiId });
    return res.status(201).json({
      success: true,
      ...intent,
      message: 'Complaint fee intent created. Complete UPI payment and confirm using UTR.',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/public/complaint-fee-confirm', async (req, res) => {
  try {
    const reference = String(req.body?.reference || '').trim();
    const utr = String(req.body?.utr || '').trim();
    const paidAmount = Number(req.body?.paidAmount || 100);

    if (!reference) return res.status(400).json({ error: 'reference is required' });
    if (utr.length < 6) return res.status(400).json({ error: 'Valid UTR/transaction id is required' });
    if (!Number.isFinite(paidAmount) || paidAmount < 100) {
      return res.status(400).json({ error: 'Paid amount must be at least Rs 100' });
    }

    const confirmed = await confirmComplaintFee({ reference, utr, paidAmount });
    if (!confirmed) return res.status(404).json({ error: 'Payment reference not found' });

    try {
      await supabase.from('audit_logs').insert({
        action: 'complaint_fee_paid',
        resource_type: 'monetization_complaint_fee',
        changes: {
          reference: confirmed.reference,
          amount: confirmed.amount,
          utr: confirmed.utr,
          paidAt: confirmed.paidAt,
        },
      });
    } catch (logError) {
      console.error('Complaint fee audit log failed:', logError?.message || logError);
    }

    return res.json({
      success: true,
      reference: confirmed.reference,
      amount: confirmed.amount,
      status: confirmed.status,
      paidAt: confirmed.paidAt,
      message: 'Complaint fee marked as paid.',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/public/complaint-fee/:reference', async (req, res) => {
  try {
    const payment = await getComplaintFeeByReference(req.params.reference);
    if (!payment) return res.status(404).json({ error: 'Payment reference not found' });
    return res.json({
      success: true,
      payment: {
        reference: payment.reference,
        amount: payment.amount,
        status: payment.status,
        paidAt: payment.paidAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/public/donation-intent', async (req, res) => {
  try {
    const amount = Number(req.body?.amount || 0);
    const contributorName = String(req.body?.contributorName || 'Supporter').trim();
    const purpose = String(req.body?.purpose || 'Platform support').trim();

    if (!Number.isFinite(amount) || amount < 100) {
      return res.status(400).json({ error: 'Minimum payment is Rs 100' });
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
      const adInquiries = await readArrayStore(adInquiriesStorePath);
      adInquiries.unshift({
        inquiryId,
        name,
        email,
        organization,
        budget,
        message,
        createdAt,
      });
      await writeArrayStore(adInquiriesStorePath, adInquiries.slice(0, 300));

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

router.get('/public/ad-campaigns', async (req, res) => {
  try {
    const today = nowIsoDate();
    const campaigns = await readArrayStore(adCampaignsStorePath);
    const source = campaigns.length ? campaigns : getDefaultCampaigns();
    const active = source.filter((campaign) => {
      if (!campaign?.isActive) return false;
      const start = String(campaign.startDate || '1900-01-01');
      const end = String(campaign.endDate || '2999-12-31');
      return start <= today && end >= today;
    });
    return res.json({ success: true, campaigns: active.slice(0, 20) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/admin/ad-campaigns', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const sponsor = String(req.body?.sponsor || '').trim();
    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || '').trim();
    const ctaLabel = String(req.body?.ctaLabel || 'Learn More').trim();
    const ctaUrl = String(req.body?.ctaUrl || '#').trim();
    const placement = String(req.body?.placement || 'homepage').trim();
    const imageUrl = String(req.body?.imageUrl || '').trim();
    const startDate = String(req.body?.startDate || nowIsoDate()).trim();
    const endDate = String(req.body?.endDate || '2999-12-31').trim();
    const isActive = req.body?.isActive !== false;

    if (!sponsor || !title || !description || !ctaUrl) {
      return res.status(400).json({ error: 'sponsor, title, description and ctaUrl are required' });
    }

    const campaigns = await readArrayStore(adCampaignsStorePath);
    const campaign = {
      id: `ADC-${Date.now()}`,
      sponsor,
      title,
      description,
      ctaLabel,
      ctaUrl,
      placement,
      imageUrl,
      startDate,
      endDate,
      isActive,
      createdAt: new Date().toISOString(),
    };
    campaigns.unshift(campaign);
    await writeArrayStore(adCampaignsStorePath, campaigns.slice(0, 500));

    return res.status(201).json({
      success: true,
      campaign,
      message: 'Ad campaign created',
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
    const adInquiries = await readArrayStore(adInquiriesStorePath);
    return res.json({ success: true, adInquiries: adInquiries.slice(0, 20) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;

