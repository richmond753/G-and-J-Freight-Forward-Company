/**
 * Demo shipment tracking data + lookup helpers.
 * Replace with carrier/AIS integrations when ready.
 */
const SAMPLE_SHIPMENTS = [
  {
    trackingNumber: 'GJ-2026-00142',
    status: 'In transit',
    mode: 'Sea freight',
    origin: 'Shanghai, CN',
    destination: 'Tema, GH',
    vessel: 'MSC Tema Express',
    eta: '2026-07-18',
    consignee: 'Elegant Homes Ltd',
    milestones: [
      { at: '2026-06-20T08:00:00Z', label: 'Booking confirmed', location: 'Shanghai' },
      { at: '2026-06-22T14:30:00Z', label: 'Cargo received at origin warehouse', location: 'Shanghai' },
      { at: '2026-06-25T09:00:00Z', label: 'Loaded on vessel', location: 'Shanghai Port' },
      { at: '2026-06-26T02:00:00Z', label: 'Vessel departed', location: 'Shanghai Port' },
      { at: '2026-07-10T11:00:00Z', label: 'In transit — en route to Tema', location: 'Atlantic' },
    ],
    documents: [
      { id: 'doc-bl-142', name: 'Draft Bill of Lading', type: 'BL', status: 'available' },
      { id: 'doc-inv-142', name: 'Commercial Invoice', type: 'invoice', status: 'available' },
      { id: 'doc-pk-142', name: 'Packing List', type: 'packing', status: 'available' },
    ],
  },
  {
    trackingNumber: 'GJ-2026-00098',
    status: 'Customs clearance',
    mode: 'Air freight',
    origin: 'Dubai, AE',
    destination: 'Accra (ACC), GH',
    vessel: 'EK787',
    eta: '2026-07-11',
    consignee: 'MOL Ghana',
    milestones: [
      { at: '2026-07-08T06:00:00Z', label: 'Booking confirmed', location: 'Dubai' },
      { at: '2026-07-09T16:20:00Z', label: 'Departed origin airport', location: 'DXB' },
      { at: '2026-07-10T01:45:00Z', label: 'Arrived Accra', location: 'ACC' },
      { at: '2026-07-10T09:30:00Z', label: 'Customs clearance in progress', location: 'Kotoka / Tema' },
    ],
    documents: [
      { id: 'doc-awb-98', name: 'Air Waybill', type: 'AWB', status: 'available' },
      { id: 'doc-inv-98', name: 'Commercial Invoice', type: 'invoice', status: 'available' },
    ],
  },
  {
    trackingNumber: 'GJ-2026-00055',
    status: 'Delivered',
    mode: 'Haulage',
    origin: 'Tema Port, GH',
    destination: 'Kumasi, GH',
    vessel: 'GJ Truck Fleet',
    eta: '2026-07-05',
    consignee: 'Engineering & Logistical Services Ghana Ltd',
    milestones: [
      { at: '2026-07-04T08:00:00Z', label: 'Container released', location: 'Tema Port' },
      { at: '2026-07-04T11:30:00Z', label: 'Departed port', location: 'Tema' },
      { at: '2026-07-05T07:15:00Z', label: 'Delivered — POD signed', location: 'Kumasi' },
    ],
    documents: [
      { id: 'doc-pod-55', name: 'Proof of Delivery', type: 'POD', status: 'available' },
      { id: 'doc-inv-55', name: 'Haulage Invoice', type: 'invoice', status: 'available' },
    ],
  },
];

function findShipment(trackingNumber) {
  if (!trackingNumber) return null;
  const key = String(trackingNumber).trim().toUpperCase();
  return SAMPLE_SHIPMENTS.find((s) => s.trackingNumber.toUpperCase() === key) || null;
}

function listShipments() {
  return SAMPLE_SHIPMENTS.map(({ trackingNumber, status, mode, origin, destination, eta }) => ({
    trackingNumber,
    status,
    mode,
    origin,
    destination,
    eta,
  }));
}

module.exports = { findShipment, listShipments, SAMPLE_SHIPMENTS };
