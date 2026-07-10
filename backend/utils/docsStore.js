/**
 * Uploaded trade documents metadata (files live in ../uploads).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const DOCS_FILE = path.join(DATA_DIR, 'documents.json');

const DOC_TYPES = [
  'bill_of_lading',
  'commercial_invoice',
  'packing_list',
  'certificate_of_origin',
  'customs_entry',
  'other',
];

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  if (!fs.existsSync(DOCS_FILE)) fs.writeFileSync(DOCS_FILE, '[]', 'utf8');
}

function readDocs() {
  ensureStore();
  try {
    const parsed = JSON.parse(fs.readFileSync(DOCS_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDocs(docs) {
  ensureStore();
  fs.writeFileSync(DOCS_FILE, JSON.stringify(docs, null, 2), 'utf8');
}

function addDocument(meta) {
  const docs = readDocs();
  const row = {
    id: 'DOC-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
    uploadedAt: new Date().toISOString(),
    ...meta,
  };
  docs.unshift(row);
  writeDocs(docs.slice(0, 1000));
  return row;
}

function listDocuments({ trackingNumber, email } = {}) {
  let docs = readDocs();
  if (trackingNumber) {
    const n = String(trackingNumber).trim().toUpperCase();
    docs = docs.filter((d) => String(d.trackingNumber || '').toUpperCase() === n);
  }
  if (email) {
    const e = String(email).trim().toLowerCase();
    docs = docs.filter((d) => String(d.email || '').toLowerCase() === e);
  }
  return docs;
}

function getDocument(id) {
  return readDocs().find((d) => d.id === id) || null;
}

module.exports = {
  DOC_TYPES,
  UPLOAD_DIR,
  ensureStore,
  addDocument,
  listDocuments,
  getDocument,
};
