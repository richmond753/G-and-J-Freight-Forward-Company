/**
 * Simple JSON-file lead store for the staff CRM inbox.
 * Suitable for MVP; swap for a database when volume grows.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, '[]', 'utf8');
}

function readLeads() {
  ensureStore();
  try {
    const raw = fs.readFileSync(LEADS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLeads(leads) {
  ensureStore();
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf8');
}

function createLead(payload) {
  const leads = readLeads();
  const lead = {
    id: 'LEAD-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
    createdAt: new Date().toISOString(),
    status: 'new',
    assignedTo: null,
    notes: '',
    ...payload,
  };
  leads.unshift(lead);
  // Keep last 500 leads on disk
  writeLeads(leads.slice(0, 500));
  return lead;
}

function updateLead(id, patch) {
  const leads = readLeads();
  const idx = leads.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  leads[idx] = { ...leads[idx], ...patch, updatedAt: new Date().toISOString() };
  writeLeads(leads);
  return leads[idx];
}

function getLead(id) {
  return readLeads().find((l) => l.id === id) || null;
}

function listLeads({ status } = {}) {
  const leads = readLeads();
  if (!status) return leads;
  return leads.filter((l) => l.status === status);
}

module.exports = { createLead, updateLead, getLead, listLeads, readLeads };
