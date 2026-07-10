/**
 * Haulage / driver trip status store.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'haulage.json');

const STATUSES = [
  'assigned',
  'en_route_pickup',
  'loaded',
  'in_transit',
  'at_destination',
  'delivered',
  'delayed',
];

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) {
    const seed = [
      {
        id: 'TRIP-TEMA-001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        origin: 'Tema Port',
        destination: 'Accra — Industrial Area',
        cargo: '1x40ft container',
        driverName: 'Demo Driver',
        vehicle: 'GN-1234-25',
        status: 'in_transit',
        note: 'Cleared gate; en route to consignee.',
        history: [
          {
            at: new Date(Date.now() - 6 * 3600000).toISOString(),
            status: 'assigned',
            note: 'Trip created',
          },
          {
            at: new Date(Date.now() - 3 * 3600000).toISOString(),
            status: 'loaded',
            note: 'Container loaded at Tema',
          },
          {
            at: new Date().toISOString(),
            status: 'in_transit',
            note: 'Cleared gate; en route to consignee.',
          },
        ],
      },
    ];
    fs.writeFileSync(FILE, JSON.stringify(seed, null, 2), 'utf8');
  }
}

function readAll() {
  ensureStore();
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(rows) {
  ensureStore();
  fs.writeFileSync(FILE, JSON.stringify(rows, null, 2), 'utf8');
}

function getTrip(id) {
  const key = String(id || '').trim().toUpperCase();
  return readAll().find((t) => String(t.id).toUpperCase() === key) || null;
}

function updateTripStatus(id, { status, note, driverName }) {
  const rows = readAll();
  const idx = rows.findIndex(
    (t) => String(t.id).toUpperCase() === String(id).trim().toUpperCase()
  );
  if (idx === -1) return null;
  const now = new Date().toISOString();
  const trip = rows[idx];
  trip.status = status;
  if (note !== undefined) trip.note = String(note).slice(0, 500);
  if (driverName) trip.driverName = String(driverName).slice(0, 80);
  trip.updatedAt = now;
  trip.history = trip.history || [];
  trip.history.unshift({ at: now, status, note: trip.note || '' });
  trip.history = trip.history.slice(0, 40);
  rows[idx] = trip;
  writeAll(rows);
  return trip;
}

function createTrip(payload) {
  const rows = readAll();
  const id =
    payload.id || 'TRIP-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const now = new Date().toISOString();
  const trip = {
    id,
    createdAt: now,
    updatedAt: now,
    origin: payload.origin || '',
    destination: payload.destination || '',
    cargo: payload.cargo || '',
    driverName: payload.driverName || '',
    vehicle: payload.vehicle || '',
    status: payload.status || 'assigned',
    note: payload.note || '',
    history: [
      {
        at: now,
        status: payload.status || 'assigned',
        note: payload.note || 'Trip created',
      },
    ],
  };
  rows.unshift(trip);
  writeAll(rows.slice(0, 500));
  return trip;
}

module.exports = { STATUSES, getTrip, updateTripStatus, createTrip, readAll };
