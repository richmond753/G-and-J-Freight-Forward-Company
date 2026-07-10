// routes/tracking.js
// Public shipment tracking API — G&J local + live multi-carrier

const express = require('express');
const router = express.Router();
const { findShipment, listShipments } = require('../utils/shipmentsStore');
const { trackLive, listCarriers } = require('../utils/liveTracker');

// GET /api/tracking/carriers
router.get('/carriers', (req, res) => {
  res.status(200).json({ success: true, data: listCarriers() });
});

// GET /api/tracking/live?number=MSKU1234567&carrier=maersk
router.get('/live', async (req, res) => {
  const number = req.query.number || req.query.trackingNumber;
  if (!number) {
    return res.status(400).json({
      success: false,
      message: 'Provide a container or tracking number via ?number=',
      demoNumbers: listShipments().map((s) => s.trackingNumber),
      carriers: listCarriers(),
    });
  }

  try {
    const result = await trackLive(number, req.query.carrier || '');
    return res.status(200).json(result);
  } catch (err) {
    console.error('[Tracking] live error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Tracking lookup failed. Please try again or use the carrier website.',
    });
  }
});

// GET /api/tracking?number=GJ-2026-00142  (local only, kept for compatibility)
router.get('/', (req, res) => {
  const number = req.query.number || req.query.trackingNumber;
  if (!number) {
    return res.status(400).json({
      success: false,
      message: 'Provide a tracking number via ?number=',
      demoNumbers: listShipments().map((s) => s.trackingNumber),
    });
  }

  const shipment = findShipment(number);
  if (!shipment) {
    return res.status(404).json({
      success: false,
      message: 'Shipment not found in G&J records. Try /api/tracking/live for ocean carriers.',
      demoNumbers: listShipments().map((s) => s.trackingNumber),
    });
  }

  return res.status(200).json({ success: true, data: shipment });
});

// GET /api/tracking/:number — prefers live multi-carrier resolution
router.get('/:number', async (req, res) => {
  try {
    const result = await trackLive(req.params.number, req.query.carrier || '');
    if (result.mode === 'local' || result.mode === 'live') {
      return res.status(200).json(result);
    }
    // Still return 200 with carrier links so the UI can help the user
    return res.status(200).json(result);
  } catch (err) {
    console.error('[Tracking] error:', err.message);
    return res.status(500).json({ success: false, message: 'Tracking lookup failed.' });
  }
});

module.exports = router;
