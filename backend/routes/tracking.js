// routes/tracking.js
// Public shipment tracking API

const express = require('express');
const router = express.Router();
const { findShipment, listShipments } = require('../utils/shipmentsStore');

// GET /api/tracking?number=GJ-2026-00142
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
      message: 'Shipment not found. Check the tracking number and try again.',
      demoNumbers: listShipments().map((s) => s.trackingNumber),
    });
  }

  return res.status(200).json({ success: true, data: shipment });
});

// GET /api/tracking/:number
router.get('/:number', (req, res) => {
  const shipment = findShipment(req.params.number);
  if (!shipment) {
    return res.status(404).json({
      success: false,
      message: 'Shipment not found.',
      demoNumbers: listShipments().map((s) => s.trackingNumber),
    });
  }
  return res.status(200).json({ success: true, data: shipment });
});

module.exports = router;
