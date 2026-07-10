/**
 * Customer accounts: login, saved quotes, past shipments.
 * Passwords hashed with scrypt. Demo account seeded on first use.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'customers.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) {
    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync('Demo1234!', salt, 64);
    const demo = {
      id: 'CUST-DEMO',
      email: 'demo@gandjfreight.com',
      name: 'Demo Customer',
      company: 'Demo Trading Ltd',
      passwordSalt: salt.toString('hex'),
      passwordHash: hash.toString('hex'),
      createdAt: new Date().toISOString(),
      quotes: [
        {
          id: 'Q-2026-014',
          createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
          route: 'Shanghai → Tema',
          mode: 'Sea FCL',
          status: 'saved',
          summary: '1x40ft — general cargo',
        },
        {
          id: 'Q-2026-021',
          createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          route: 'Dubai → Accra',
          mode: 'Air',
          status: 'quoted',
          summary: '320 kg — electronics',
        },
      ],
      shipments: [
        {
          id: 'GJ-2026-00142',
          status: 'In transit',
          origin: 'Ningbo',
          destination: 'Tema',
          eta: '2026-07-18',
          mode: 'Sea',
        },
        {
          id: 'GJ-2025-00891',
          status: 'Delivered',
          origin: 'Rotterdam',
          destination: 'Tema',
          eta: '2025-11-02',
          mode: 'Sea',
        },
      ],
    };
    fs.writeFileSync(FILE, JSON.stringify([demo], null, 2), 'utf8');
  }
  if (!fs.existsSync(SESSIONS_FILE)) {
    fs.writeFileSync(SESSIONS_FILE, '[]', 'utf8');
  }
}

function readCustomers() {
  ensureStore();
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCustomers(rows) {
  ensureStore();
  fs.writeFileSync(FILE, JSON.stringify(rows, null, 2), 'utf8');
}

function readSessions() {
  ensureStore();
  try {
    const parsed = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSessions(rows) {
  ensureStore();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(rows, null, 2), 'utf8');
}

function findByEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  return readCustomers().find((c) => c.email === e) || null;
}

function verifyPassword(customer, password) {
  const salt = Buffer.from(customer.passwordSalt, 'hex');
  const hash = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(customer.passwordHash, 'hex');
  if (hash.length !== expected.length) return false;
  return crypto.timingSafeEqual(hash, expected);
}

function publicCustomer(c) {
  return {
    id: c.id,
    email: c.email,
    name: c.name,
    company: c.company || '',
  };
}

function createSession(customerId) {
  const sessions = readSessions().filter(
    (s) => s.customerId !== customerId && Date.now() < s.expiresAt
  );
  const token = crypto.randomBytes(24).toString('hex');
  sessions.push({
    token,
    customerId,
    expiresAt: Date.now() + 7 * 24 * 3600000,
  });
  writeSessions(sessions.slice(-200));
  return token;
}

function getCustomerByToken(token) {
  if (!token) return null;
  const sessions = readSessions();
  const session = sessions.find((s) => s.token === token && Date.now() < s.expiresAt);
  if (!session) return null;
  return readCustomers().find((c) => c.id === session.customerId) || null;
}

function destroySession(token) {
  writeSessions(readSessions().filter((s) => s.token !== token));
}

function login(email, password) {
  const customer = findByEmail(email);
  if (!customer || !verifyPassword(customer, password)) return null;
  const token = createSession(customer.id);
  return { token, customer: publicCustomer(customer) };
}

function register({ email, password, name, company }) {
  const existing = findByEmail(email);
  if (existing) return { error: 'Email already registered.' };
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 64);
  const customer = {
    id: 'CUST-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
    email: String(email).trim().toLowerCase(),
    name: String(name || '').slice(0, 80),
    company: String(company || '').slice(0, 80),
    passwordSalt: salt.toString('hex'),
    passwordHash: hash.toString('hex'),
    createdAt: new Date().toISOString(),
    quotes: [],
    shipments: [],
  };
  const rows = readCustomers();
  rows.push(customer);
  writeCustomers(rows);
  const token = createSession(customer.id);
  return { token, customer: publicCustomer(customer) };
}

module.exports = {
  ensureStore,
  login,
  register,
  getCustomerByToken,
  destroySession,
  publicCustomer,
  findByEmail,
};
