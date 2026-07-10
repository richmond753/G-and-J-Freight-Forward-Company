/**
 * Live multi-carrier container tracking.
 * - Local G&J demo/ops records first
 * - Optional ShipsGo API when SHIPSGO_AUTH_CODE is set
 * - Best-effort public Maersk lookup
 * - Always returns official carrier deep-links (Maersk, MSC, CMA CGM, …)
 */

const {
  normalizeContainerId,
  isContainerNumber,
  detectCarrier,
  getCarrierById,
  allCarrierLinks,
  listCarriers,
} = require('./carriers');
const { findShipment } = require('./shipmentsStore');

const FETCH_TIMEOUT_MS = 4000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function tryMaerskPublic(container) {
  // Without a consumer key, Maersk public endpoints usually hang/401 — skip to keep UX fast
  if (!process.env.MAERSK_CONSUMER_KEY) return null;

  const urls = [
    `https://api.maersk.com/synergy/tracking/${encodeURIComponent(container)}`,
    `https://api.maersk.com/synergy/tracking/v2/events?containers=${encodeURIComponent(container)}`,
  ];

  for (const url of urls) {
    try {
      const headers = {
        Accept: 'application/json',
        'User-Agent': 'G-and-J-Freight-Tracker/1.0',
        'Consumer-Key': process.env.MAERSK_CONSUMER_KEY,
      };
      const res = await fetchWithTimeout(url, { headers });
      if (!res.ok) continue;
      const data = await res.json();
      return normalizeMaerskPayload(container, data);
    } catch {
      // try next
    }
  }
  return null;
}

function normalizeMaerskPayload(container, data) {
  if (!data || typeof data !== 'object') return null;

  // Shape varies by endpoint — extract what we can
  const events =
    data.events ||
    data.containers?.[0]?.events ||
    data.container?.events ||
    data.locations ||
    [];

  const milestones = (Array.isArray(events) ? events : [])
    .slice(0, 20)
    .map((e) => ({
      at: e.eventDateTime || e.eventTime || e.timestamp || e.date || '',
      label: e.eventName || e.eventType || e.status || e.activity || 'Update',
      location:
        e.location?.city ||
        e.location?.terminal ||
        e.locationName ||
        e.place ||
        e.facility ||
        '',
    }))
    .filter((m) => m.label);

  if (!milestones.length && !data.status && !data.containers) return null;

  return {
    source: 'maersk',
    trackingNumber: container,
    status: data.status || data.containers?.[0]?.status || milestones[0]?.label || 'In transit',
    mode: 'Sea freight',
    carrier: 'Maersk',
    origin: data.origin || data.containers?.[0]?.origin || '—',
    destination: data.destination || data.containers?.[0]?.destination || '—',
    vessel: data.vesselName || data.containers?.[0]?.vesselName || 'Maersk service',
    eta: data.eta || data.containers?.[0]?.eta || '—',
    consignee: '—',
    milestones,
    documents: [],
  };
}

async function tryShipsGo(container, carrier) {
  const auth = process.env.SHIPSGO_AUTH_CODE;
  if (!auth) return null;

  const shippingLine = carrier?.shipsgoName || 'OTHERS';
  const form = new URLSearchParams({
    authCode: auth,
    containerNumber: container,
    shippingLine,
    emailAddress: process.env.CONTACT_RECEIVER || 'info@gandjfreightservices.com',
  });

  try {
    const postRes = await fetchWithTimeout(
      'https://shipsgo.com/api/v1.2/ContainerService/PostContainerInfo',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      }
    );
    const postText = await postRes.text();
    let requestId = null;
    try {
      const parsed = JSON.parse(postText);
      requestId = parsed.RequestId || parsed.requestId || parsed.requestID;
    } catch {
      const n = parseInt(postText, 10);
      if (!Number.isNaN(n)) requestId = n;
    }
    if (!requestId) return null;

    const getRes = await fetchWithTimeout(
      `https://shipsgo.com/api/v1.2/ContainerService/GetContainerInfo/?authCode=${encodeURIComponent(auth)}&requestId=${encodeURIComponent(requestId)}&mapPoint=true`
    );
    if (!getRes.ok) return null;
    const info = await getRes.json();
    return normalizeShipsGo(container, carrier, info);
  } catch {
    return null;
  }
}

function normalizeShipsGo(container, carrier, info) {
  const row = Array.isArray(info) ? info[0] : info;
  if (!row) return null;

  const movements = row.Movements || row.movements || row.Containers?.[0]?.Movements || [];
  const milestones = (Array.isArray(movements) ? movements : []).map((m) => ({
    at: m.Date || m.EventDate || m.date || '',
    label: m.Status || m.Event || m.status || 'Update',
    location: [m.Location, m.Vessel].filter(Boolean).join(' · ') || '',
  }));

  return {
    source: 'shipsgo',
    trackingNumber: container,
    status: row.Status || row.LastStatus || milestones[0]?.label || 'Tracked',
    mode: 'Sea freight',
    carrier: carrier?.name || row.ShippingLine || 'Ocean carrier',
    origin: row.Pol || row.POL || row.From || '—',
    destination: row.Pod || row.POD || row.To || '—',
    vessel: row.Vessel || row.VesselName || '—',
    eta: row.Eta || row.ETA || row.ArrivalDate || '—',
    consignee: '—',
    milestones,
    documents: [],
  };
}

/**
 * Main entry: resolve a tracking / container number.
 */
async function trackLive(rawNumber, carrierId) {
  const raw = String(rawNumber || '').trim();
  const containerId = normalizeContainerId(raw);
  const container = isContainerNumber(raw);

  // G&J booking refs must keep hyphens (e.g. GJ-2026-00142)
  const local = findShipment(raw) || findShipment(raw.toUpperCase());
  if (local) {
    return {
      success: true,
      mode: 'local',
      data: { ...local, source: 'gandj', carrier: 'G and J Freight' },
      carriers: listCarriers(),
      links: container ? allCarrierLinks(containerId) : [],
    };
  }

  const detected = carrierId ? getCarrierById(carrierId) : detectCarrier(containerId);
  const links = allCarrierLinks(containerId);
  const primaryLink = detected
    ? { id: detected.id, name: detected.name, url: detected.trackUrl(containerId) }
    : null;

  let live = null;
  if (container) {
    // Prefer ShipsGo when configured (multi-carrier). Keep public Maersk attempt short.
    live = await tryShipsGo(containerId, detected);
    if (!live && (detected?.id === 'maersk' || carrierId === 'maersk' || !detected)) {
      live = await tryMaerskPublic(containerId);
    }
  }

  if (live) {
    return {
      success: true,
      mode: 'live',
      data: live,
      detectedCarrier: detected ? { id: detected.id, name: detected.name } : null,
      primaryLink,
      links,
      carriers: listCarriers(),
    };
  }

  return {
    success: true,
    mode: 'carrier-links',
    message: container
      ? detected
        ? `Detected ${detected.name}. Open live tracking on the carrier site below. For in-app milestones, add SHIPSGO_AUTH_CODE in environment.`
        : 'Container number recognised. Choose a shipping line or open a carrier tracker below.'
      : 'No G&J booking found. If this is a container number (4 letters + 7 digits), select a shipping line to track on the carrier site.',
    data: {
      source: 'links',
      trackingNumber: container ? containerId : raw.toUpperCase(),
      status: 'Open on carrier',
      mode: 'Sea freight',
      carrier: detected?.name || 'Select carrier',
      origin: '—',
      destination: '—',
      vessel: '—',
      eta: '—',
      consignee: '—',
      milestones: [],
      documents: [],
    },
    detectedCarrier: detected ? { id: detected.id, name: detected.name } : null,
    primaryLink,
    links: detected
      ? [primaryLink, ...links.filter((l) => l.id !== detected.id)]
      : links,
    carriers: listCarriers(),
    isContainer: container,
  };
}

module.exports = { trackLive, listCarriers, isContainerNumber, detectCarrier };
