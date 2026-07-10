// routes/alerts.js
// Subscribe to shipment status emails + run alert checks

const express = require('express');
const { body, validationResult } = require('express-validator');
const transporter = require('../config/mailer');
const { escapeHtml } = require('../utils/escapeHtml');
const { subscribeAlert, listActiveAlerts, updateAlert } = require('../utils/alertsStore');
const { trackLive } = require('../utils/liveTracker');
const { requireAdmin } = require('../middleware/adminAuth');
const { contactLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

function fingerprint(data) {
  if (!data) return '';
  const last = (data.milestones && data.milestones[0]) || {};
  return [data.status, data.eta, last.label, last.at, last.location].join('|');
}

router.post(
  '/subscribe',
  contactLimiter,
  [
    body('trackingNumber').trim().notEmpty().isLength({ max: 40 }),
    body('email').trim().isEmail().normalizeEmail(),
    body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 30 }),
    body('carrier').optional({ checkFalsy: true }).trim().isLength({ max: 40 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed.',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { trackingNumber, email, phone, carrier } = req.body;
    const row = subscribeAlert({ trackingNumber, email, phone, carrier });

    // Seed last status from a live lookup (best effort)
    try {
      const live = await trackLive(trackingNumber, carrier || '');
      if (live && live.data) {
        updateAlert(row.id, {
          lastStatus: live.data.status || '',
          lastFingerprint: fingerprint(live.data),
        });
      }
    } catch {
      /* ignore */
    }

    try {
      await transporter.sendMail({
        from: `"G and J Freight Services" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Tracking alerts on for ${trackingNumber}`,
        html: `
          <p>Hello,</p>
          <p>You will receive email updates when we detect a status change for
          <strong>${escapeHtml(trackingNumber)}</strong>.</p>
          <p>Track anytime:
            <a href="https://g-and-j-freight-forward-company.onrender.com/track.html?number=${encodeURIComponent(trackingNumber)}">
              Open tracker
            </a>
          </p>
          <p>— G and J Freight Services</p>
        `,
      });
    } catch (err) {
      console.error('[Alerts] confirm email failed:', err.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Alerts enabled. We emailed a confirmation.',
      alertId: row.id,
    });
  }
);

// Admin or cron: check all active alerts and email on change
router.post('/check', requireAdmin, async (req, res) => {
  const active = listActiveAlerts();
  const sent = [];
  const unchanged = [];
  const failed = [];

  for (const alert of active) {
    try {
      const live = await trackLive(alert.trackingNumber, alert.carrier || '');
      const data = live && live.data;
      if (!data) {
        failed.push({ id: alert.id, reason: 'no data' });
        continue;
      }
      const fp = fingerprint(data);
      if (fp && fp === alert.lastFingerprint) {
        unchanged.push(alert.id);
        continue;
      }
      if (!fp) {
        unchanged.push(alert.id);
        continue;
      }

      // Skip first noisy update if we had empty fingerprint and empty status
      const isFirstSeed = !alert.lastFingerprint && !alert.lastStatus;
      updateAlert(alert.id, {
        lastStatus: data.status || '',
        lastFingerprint: fp,
      });

      if (isFirstSeed) {
        unchanged.push(alert.id);
        continue;
      }

      await transporter.sendMail({
        from: `"G and J Freight Services" <${process.env.SMTP_USER}>`,
        to: alert.email,
        subject: `Update: ${alert.trackingNumber} — ${data.status || 'status change'}`,
        html: `
          <p>Shipment <strong>${escapeHtml(alert.trackingNumber)}</strong> updated.</p>
          <ul>
            <li>Status: ${escapeHtml(data.status || '—')}</li>
            <li>Carrier: ${escapeHtml(data.carrier || '—')}</li>
            <li>ETA: ${escapeHtml(String(data.eta || '—'))}</li>
            <li>Vessel: ${escapeHtml(data.vessel || '—')}</li>
          </ul>
          <p><a href="https://g-and-j-freight-forward-company.onrender.com/track.html?number=${encodeURIComponent(alert.trackingNumber)}">View tracking</a></p>
          ${
            alert.phone
              ? `<p>WhatsApp tip: message us on +233 24 433 3374 quoting ${escapeHtml(alert.trackingNumber)}.</p>`
              : ''
          }
          <p>— G and J Freight Services</p>
        `,
      });
      sent.push(alert.id);
    } catch (err) {
      failed.push({ id: alert.id, reason: err.message });
    }
  }

  res.status(200).json({
    success: true,
    checked: active.length,
    sent: sent.length,
    unchanged: unchanged.length,
    failed,
  });
});

router.get('/', requireAdmin, (req, res) => {
  res.status(200).json({ success: true, data: listActiveAlerts() });
});

module.exports = router;
