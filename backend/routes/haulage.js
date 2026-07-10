// routes/haulage.js — driver / haulage trip status

const express = require('express');
const { body, validationResult } = require('express-validator');
const { contactLimiter } = require('../middleware/rateLimiter');
const {
  STATUSES,
  getTrip,
  updateTripStatus,
  createTrip,
} = require('../utils/haulageStore');

const router = express.Router();

function haulagePinOk(pin) {
  const expected = process.env.HAULAGE_PIN || process.env.ADMIN_TOKEN || '';
  return expected && String(pin || '') === expected;
}

router.get('/statuses', (_req, res) => {
  res.status(200).json({
    success: true,
    data: STATUSES.map((id) => ({
      id,
      label: id
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
    })),
  });
});

router.get('/:tripId', (req, res) => {
  const trip = getTrip(req.params.tripId);
  if (!trip) {
    return res.status(404).json({
      success: false,
      message: 'Trip not found.',
      hint: 'Demo trip: TRIP-TEMA-001',
    });
  }
  res.status(200).json({ success: true, data: trip });
});

router.post(
  '/update',
  contactLimiter,
  [
    body('tripId').trim().notEmpty().isLength({ max: 40 }),
    body('status').trim().isIn(STATUSES),
    body('pin').trim().notEmpty(),
    body('note').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
    body('driverName').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed.',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }
    if (!haulagePinOk(req.body.pin)) {
      return res.status(401).json({ success: false, message: 'Invalid driver PIN.' });
    }
    const trip = updateTripStatus(req.body.tripId, {
      status: req.body.status,
      note: req.body.note,
      driverName: req.body.driverName,
    });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found.' });
    }
    res.status(200).json({
      success: true,
      message: 'Haulage status updated.',
      data: trip,
    });
  }
);

// Optional: create trip with admin/haulage pin
router.post(
  '/',
  contactLimiter,
  [
    body('pin').trim().notEmpty(),
    body('origin').trim().notEmpty().isLength({ max: 120 }),
    body('destination').trim().notEmpty().isLength({ max: 120 }),
    body('cargo').optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
    body('driverName').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
    body('vehicle').optional({ checkFalsy: true }).trim().isLength({ max: 40 }),
    body('id').optional({ checkFalsy: true }).trim().isLength({ max: 40 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, message: 'Validation failed.' });
    }
    if (!haulagePinOk(req.body.pin)) {
      return res.status(401).json({ success: false, message: 'Invalid PIN.' });
    }
    const trip = createTrip(req.body);
    res.status(201).json({ success: true, data: trip });
  }
);

module.exports = router;
