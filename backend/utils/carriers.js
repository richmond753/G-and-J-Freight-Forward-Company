/**
 * Ocean carrier registry: owner-code prefixes + official tracking URLs.
 * Used for auto-detect and live deep-link / API tracking.
 */

const CARRIERS = [
  {
    id: 'maersk',
    name: 'Maersk',
    shipsgoName: 'MAERSK',
    prefixes: ['MSKU', 'MRKU', 'MIEU', 'MAEU', 'MCRU', 'MVIU'],
    trackUrl: (n) => `https://www.maersk.com/tracking/${encodeURIComponent(n)}`,
  },
  {
    id: 'msc',
    name: 'MSC',
    shipsgoName: 'MSC',
    prefixes: ['MSCU', 'MEDU', 'MSDU'],
    trackUrl: (n) =>
      `https://www.msc.com/en/track-a-shipment?trackingNumber=${encodeURIComponent(n)}`,
  },
  {
    id: 'cma-cgm',
    name: 'CMA CGM',
    shipsgoName: 'CMA CGM',
    prefixes: ['CMAU', 'CGMU', 'CMDU', 'APZU', 'ANNU'],
    trackUrl: (n) =>
      `https://www.cma-cgm.com/ebusiness/tracking/search?SearchType=2&Number=${encodeURIComponent(n)}`,
  },
  {
    id: 'hapag-lloyd',
    name: 'Hapag-Lloyd',
    shipsgoName: 'HAPAG LLOYD',
    prefixes: ['HLCU', 'HLXU', 'HAMU'],
    trackUrl: (n) =>
      `https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html?container=${encodeURIComponent(n)}`,
  },
  {
    id: 'one',
    name: 'ONE (Ocean Network Express)',
    shipsgoName: 'ONE',
    prefixes: ['ONEY', 'ONEU', 'NYKU', 'KKLU'],
    trackUrl: (n) =>
      `https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking?ctrack-field=${encodeURIComponent(n)}&trakNoSearch=C`,
  },
  {
    id: 'evergreen',
    name: 'Evergreen',
    shipsgoName: 'EVERGREEN',
    prefixes: ['EGHU', 'EGSU', 'EISU', 'EMCU'],
    trackUrl: (n) =>
      `https://ct.shipmentlink.com/servlet/TDB1_CargoTracking.do?TYPE=CT&BL=${encodeURIComponent(n)}`,
  },
  {
    id: 'cosco',
    name: 'COSCO',
    shipsgoName: 'COSCO',
    prefixes: ['COSU', 'CBHU', 'CSLU'],
    trackUrl: (n) =>
      `https://elines.coscoshipping.com/ebusiness/cargoTracking?trackingType=CONTAINER&number=${encodeURIComponent(n)}`,
  },
  {
    id: 'oocl',
    name: 'OOCL',
    shipsgoName: 'OOCL',
    prefixes: ['OOLU', 'OOCU'],
    trackUrl: (n) =>
      `https://www.oocl.com/eng/ourservices/eservices/cargotracking/Pages/cargotracking.aspx?ContainerNumber=${encodeURIComponent(n)}`,
  },
  {
    id: 'yang-ming',
    name: 'Yang Ming',
    shipsgoName: 'YANG MING',
    prefixes: ['YMLU', 'YMCU'],
    trackUrl: (n) =>
      `https://www.yangming.com/e-service/Track_Trace/track_trace_cargo_tracking.aspx?Container_No=${encodeURIComponent(n)}`,
  },
  {
    id: 'zim',
    name: 'ZIM',
    shipsgoName: 'ZIM',
    prefixes: ['ZIMU', 'ZCSU'],
    trackUrl: (n) =>
      `https://www.zim.com/tools/track-a-shipment?consnumber=${encodeURIComponent(n)}`,
  },
];

/** ISO 6346-ish: 4 letters + 7 digits (optional check digit already in the 7) */
function normalizeContainerId(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[\s-]/g, '');
}

function isContainerNumber(raw) {
  return /^[A-Z]{4}\d{7}$/.test(normalizeContainerId(raw));
}

function detectCarrier(raw) {
  const id = normalizeContainerId(raw);
  const prefix = id.slice(0, 4);
  return CARRIERS.find((c) => c.prefixes.includes(prefix)) || null;
}

function getCarrierById(id) {
  return CARRIERS.find((c) => c.id === id) || null;
}

function listCarriers() {
  return CARRIERS.map(({ id, name }) => ({ id, name }));
}

function allCarrierLinks(number) {
  const n = normalizeContainerId(number);
  return CARRIERS.map((c) => ({
    id: c.id,
    name: c.name,
    url: c.trackUrl(n),
  }));
}

module.exports = {
  CARRIERS,
  normalizeContainerId,
  isContainerNumber,
  detectCarrier,
  getCarrierById,
  listCarriers,
  allCarrierLinks,
};
