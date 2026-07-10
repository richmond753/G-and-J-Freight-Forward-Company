// routes/portal.js
// Scaffold: documents vault, payments, carrier status stubs
// These endpoints define the product surface for Phase C integrations.

const express = require('express');
const router = express.Router();
const { findShipment, listShipments } = require('../utils/shipmentsStore');

// GET /api/portal/documents?trackingNumber=
router.get('/documents', (req, res) => {
  const number = req.query.trackingNumber;
  if (!number) {
    return res.status(400).json({
      success: false,
      message: 'Provide trackingNumber to list documents.',
      hint: 'Demo: GJ-2026-00142',
    });
  }
  const shipment = findShipment(number);
  if (!shipment) {
    return res.status(404).json({ success: false, message: 'Shipment not found.' });
  }
  res.status(200).json({
    success: true,
    trackingNumber: shipment.trackingNumber,
    data: shipment.documents || [],
    note: 'Document download URLs will connect to secure storage in a later release.',
  });
});

// GET /api/portal/payments/methods
router.get('/payments/methods', (req, res) => {
  res.status(200).json({
    success: true,
    data: [
      { id: 'momo-mtn', label: 'MTN Mobile Money', currency: 'GHS', status: 'coming_soon' },
      { id: 'momo-vodafone', label: 'Vodafone Cash', currency: 'GHS', status: 'coming_soon' },
      { id: 'card', label: 'Card (Visa / Mastercard)', currency: 'GHS/USD', status: 'coming_soon' },
      { id: 'bank', label: 'Bank transfer', currency: 'GHS/USD', status: 'available_offline' },
    ],
    message: 'Online payments are scaffolded. Contact accounts to settle invoices today.',
  });
});

// POST /api/portal/payments/intent — scaffold only
router.post('/payments/intent', (req, res) => {
  const { trackingNumber, method, amount } = req.body || {};
  if (!trackingNumber || !method || !amount) {
    return res.status(422).json({
      success: false,
      message: 'trackingNumber, method, and amount are required.',
    });
  }
  res.status(501).json({
    success: false,
    message: 'Online payment capture is not enabled yet. Please pay via bank transfer or Mobile Money to the accounts team.',
    scaffold: {
      trackingNumber,
      method,
      amount,
      next: 'Wire Paystack / Flutterwave / MoMo API credentials to activate.',
    },
  });
});

// GET /api/portal/carriers/status — scaffold for AIS/carrier APIs
router.get('/carriers/status', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      providers: [
        { id: 'manual', name: 'G&J Operations (manual milestones)', status: 'active' },
        { id: 'ais', name: 'AIS vessel tracking', status: 'planned' },
        { id: 'airline', name: 'Airline cargo status API', status: 'planned' },
        { id: 'shipping-line', name: 'Ocean carrier EDI/API', status: 'planned' },
      ],
      liveShipments: listShipments(),
    },
    message: 'Carrier integrations are scaffolded. Tracking today uses G&J operations milestones.',
  });
});

module.exports = router;
