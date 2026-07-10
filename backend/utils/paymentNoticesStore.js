/**
 * Persist "I have paid" notices so accounts can review even if SMTP fails.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'payment-notices.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '[]', 'utf8');
}

function readNotices() {
  ensureStore();
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeNotices(rows) {
  ensureStore();
  fs.writeFileSync(FILE, JSON.stringify(rows, null, 2), 'utf8');
}

function createPaymentNotice(payload) {
  const rows = readNotices();
  const row = {
    id: 'PAY-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
    createdAt: new Date().toISOString(),
    status: 'new',
    ...payload,
  };
  rows.unshift(row);
  writeNotices(rows.slice(0, 500));
  return row;
}

function listPaymentNotices() {
  return readNotices();
}

module.exports = { createPaymentNotice, listPaymentNotices };
