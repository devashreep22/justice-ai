import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const complaintFeeStorePath = path.resolve(__dirname, '../data/complaint-fee-store.json');

const normalizeReference = (reference = '') => String(reference).trim().toUpperCase();

const readFeePayments = async () => {
  try {
    const raw = await fs.readFile(complaintFeeStorePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeFeePayments = async (payments) => {
  await fs.mkdir(path.dirname(complaintFeeStorePath), { recursive: true });
  await fs.writeFile(complaintFeeStorePath, JSON.stringify(payments, null, 2), 'utf-8');
};

export const createComplaintFeeIntent = async ({ name, email, phone, amount, upiId }) => {
  const finalAmount = Math.max(100, Math.round(Number(amount) || 100));
  const reference = normalizeReference(`CMP-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`);
  const createdAt = new Date().toISOString();
  const note = `Complaint filing fee | Ref: ${reference}`;
  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    'JusticeAI'
  )}&am=${finalAmount}&cu=INR&tn=${encodeURIComponent(note)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiLink)}`;

  const payments = await readFeePayments();
  payments.unshift({
    reference,
    name,
    email,
    phone,
    amount: finalAmount,
    status: 'pending',
    upiId,
    upiLink,
    qrCodeUrl,
    createdAt,
    paidAt: null,
    utr: null,
  });
  await writeFeePayments(payments.slice(0, 800));

  return {
    reference,
    amount: finalAmount,
    upiId,
    upiLink,
    qrCodeUrl,
    status: 'pending',
    createdAt,
  };
};

export const confirmComplaintFee = async ({ reference, utr, paidAmount }) => {
  const normalizedReference = normalizeReference(reference);
  const normalizedUtr = String(utr || '').trim();
  if (!normalizedReference) return null;

  const payments = await readFeePayments();
  const index = payments.findIndex((item) => normalizeReference(item.reference) === normalizedReference);
  if (index === -1) return null;

  const current = payments[index];
  const finalAmount = Math.max(100, Math.round(Number(paidAmount) || Number(current.amount) || 100));
  const updated = {
    ...current,
    status: 'paid',
    amount: finalAmount,
    utr: normalizedUtr || current.utr || null,
    paidAt: new Date().toISOString(),
  };
  payments[index] = updated;
  await writeFeePayments(payments);
  return updated;
};

export const getComplaintFeeByReference = async (reference) => {
  const normalizedReference = normalizeReference(reference);
  if (!normalizedReference) return null;
  const payments = await readFeePayments();
  return payments.find((item) => normalizeReference(item.reference) === normalizedReference) || null;
};

export const isComplaintFeePaid = async (reference, minimumAmount = 100) => {
  const payment = await getComplaintFeeByReference(reference);
  if (!payment) return false;
  return payment.status === 'paid' && Number(payment.amount || 0) >= minimumAmount;
};

