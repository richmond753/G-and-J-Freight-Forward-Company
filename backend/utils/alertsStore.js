/**
 * Shipment alert subscriptions (email when status/milestone changes).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ALERTS_FILE = path.join(DATA_DIR, 'alerts.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(ALERTS_FILE)) fs.writeFileSync(ALERTS_FILE, '[]', 'utf8');
}

function readAlerts() {
  ensureStore();
  try {
    const parsed = JSON.parse(fs.readFileSync(ALERTS_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAlerts(alerts) {
  ensureStore();
  fs.writeFileSync(ALERTS_FILE, JSON.stringify(alerts, null, 2), 'utf8');
}

function subscribeAlert({ trackingNumber, email, phone, carrier }) {
  const alerts = readAlerts();
  const number = String(trackingNumber || '').trim().toUpperCase();
  const mail = String(email || '').trim().toLowerCase();
  if (!number || !mail) return null;

  const existing = alerts.find(
    (a) => a.trackingNumber === number && a.email === mail && a.active !== false
  );
  if (existing) {
    existing.phone = phone || existing.phone || '';
    existing.carrier = carrier || existing.carrier || '';
    existing.updatedAt = new Date().toISOString();
    writeAlerts(alerts);
    return existing;
  }

  const row = {
    id: 'ALT-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
    trackingNumber: number,
    email: mail,
    phone: phone || '',
    carrier: carrier || '',
    lastStatus: '',
    lastFingerprint: '',
    active: true,
    createdAt: new Date().toISOString(),
  };
  alerts.unshift(row);
  writeAlerts(alerts.slice(0, 1000));
  return row;
}

function listActiveAlerts() {
  return readAlerts().filter((a) => a.active !== false);
}

function updateAlert(id, patch) {
  const alerts = readAlerts();
  const idx = alerts.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  alerts[idx] = { ...alerts[idx], ...patch, updatedAt: new Date().toISOString() };
  writeAlerts(alerts);
  return alerts[idx];
}

module.exports = {
  subscribeAlert,
  listActiveAlerts,
  updateAlert,
  readAlerts,
};
