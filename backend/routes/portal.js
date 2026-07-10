// routes/portal.js
// Documents vault, payments (Paystack + MoMo/bank), carrier status

const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { findShipment, listShipments } = require('../utils/shipmentsStore');
const { publicPaymentConfig, getPaymentConfig } = require('../utils/paymentConfig');
const { initializeTransaction, verifyTransaction } = require('../utils/paystack');
const { createPaymentNotice } = require('../utils/paymentNoticesStore');
const { contactLimiter } = require('../middleware/rateLimiter');
const transporter = require('../config/mailer');
const { escapeHtml } = require('../utils/escapeHtml');

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

// GET /api/portal/payments/config — public MoMo / bank / Paystack status
router.get('/payments/config', (_req, res) => {
  res.status(200).json({ success: true, data: publicPaymentConfig() });
});

// GET /api/portal/payments/methods
router.get('/payments/methods', (_req, res) => {
  const cfg = publicPaymentConfig();
  const paystackStatus = cfg.paystack.enabled ? 'available' : 'keys_required';
  res.status(200).json({
    success: true,
    data: [
      {
        id: 'momo-mtn',
        label: 'Mobile Money',
        currency: 'GHS',
        status: 'available',
        numbers: (cfg.momo.numbers || []).map((n) => n.numberDisplay),
        accountName: cfg.momo.accountName,
      },
      {
        id: 'paystack',
        label: 'Paystack (MoMo + Card)',
        currency: 'GHS',
        status: paystackStatus,
      },
      {
        id: 'card',
        label: 'Card (Visa / Mastercard via Paystack)',
        currency: 'GHS',
        status: paystackStatus,
      },
      {
        id: 'bank',
        label: 'Bank transfer',
        currency: 'GHS',
        status: cfg.bank.configured ? 'available' : 'request_via_whatsapp',
        bank: cfg.bank.configured
          ? {
              name: cfg.bank.name,
              accountName: cfg.bank.accountName,
              accountNumber: cfg.bank.accountNumber,
              branch: cfg.bank.branch || '',
            }
          : null,
      },
    ],
    message: cfg.message,
    payUrl: '/pay.html',
  });
});

// POST /api/portal/payments/intent — Paystack initialize when keys set
router.post(
  '/payments/intent',
  contactLimiter,
  [
    body('email').trim().isEmail().normalizeEmail(),
    body('amount').isFloat({ min: 1 }),
    body('trackingNumber').optional({ checkFalsy: true }).trim().isLength({ max: 40 }),
    body('method').optional({ checkFalsy: true }).trim().isLength({ max: 40 }),
    body('note').optional({ checkFalsy: true }).trim().isLength({ max: 300 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        message: 'Provide a valid email and amount (GHS).',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const cfg = getPaymentConfig();
    if (!cfg.paystack.enabled) {
      return res.status(501).json({
        success: false,
        message:
          'Online Paystack checkout is not enabled yet. Pay via MoMo or bank on the Pay page, or add PAYSTACK_PUBLIC_KEY and PAYSTACK_SECRET_KEY on the server.',
        payUrl: '/pay.html',
        momo: cfg.momo,
        bank: cfg.bank,
      });
    }

    const { email, amount, trackingNumber, note } = req.body;
    const reference =
      'GJ-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex');
    const callbackUrl = `${cfg.siteUrl}/pay.html?reference=${encodeURIComponent(reference)}`;

    try {
      const init = await initializeTransaction({
        email,
        amountGhs: amount,
        reference,
        callbackUrl,
        metadata: {
          trackingNumber: trackingNumber || '',
          note: note || '',
          custom_fields: [
            {
              display_name: 'Tracking / Invoice',
              variable_name: 'tracking_number',
              value: trackingNumber || 'N/A',
            },
          ],
        },
      });

      res.status(200).json({
        success: true,
        message: 'Checkout ready. Complete payment on Paystack.',
        data: {
          reference: init.reference,
          authorizationUrl: init.authorization_url,
          accessCode: init.access_code,
          publicKey: cfg.paystack.publicKey,
          amount: Number(amount),
          currency: 'GHS',
        },
      });
    } catch (err) {
      console.error('[Paystack] initialize failed:', err.message);
      res.status(502).json({
        success: false,
        message: err.message || 'Could not start Paystack checkout.',
      });
    }
  }
);

// GET /api/portal/payments/verify?reference=
router.get('/payments/verify', async (req, res) => {
  const reference = String(req.query.reference || '').trim();
  if (!reference) {
    return res.status(400).json({ success: false, message: 'reference is required.' });
  }

  const cfg = getPaymentConfig();
  if (!cfg.paystack.enabled) {
    return res.status(501).json({
      success: false,
      message: 'Paystack is not configured on this server.',
    });
  }

  try {
    const tx = await verifyTransaction(reference);
    const paid = tx.status === 'success';
    res.status(200).json({
      success: true,
      paid,
      data: {
        reference: tx.reference,
        status: tx.status,
        amount: (tx.amount || 0) / 100,
        currency: tx.currency,
        channel: tx.channel,
        paidAt: tx.paid_at,
        customer: tx.customer && tx.customer.email,
        metadata: tx.metadata || {},
      },
      message: paid ? 'Payment confirmed.' : `Payment status: ${tx.status}`,
    });
  } catch (err) {
    console.error('[Paystack] verify failed:', err.message);
    res.status(502).json({
      success: false,
      message: err.message || 'Could not verify payment.',
    });
  }
});

// POST /api/portal/payments/notify — "I have paid" for manual MoMo/bank
router.post(
  '/payments/notify',
  contactLimiter,
  [
    body('email').trim().isEmail().normalizeEmail(),
    body('amount').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body('method').trim().isIn(['momo', 'bank', 'paystack']),
    body('trackingNumber').optional({ checkFalsy: true }).trim().isLength({ max: 40 }),
    body('reference').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
    body('note').optional({ checkFalsy: true }).trim().isLength({ max: 400 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        message: 'Enter a valid email and payment method, then try again.',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { email, amount, method, trackingNumber, reference, note } = req.body;
    const cfg = getPaymentConfig();
    const notice = createPaymentNotice({
      email,
      amount: amount != null ? Number(amount) : null,
      method,
      trackingNumber: trackingNumber || '',
      reference: reference || '',
      note: note || '',
    });

    let emailed = false;
    const to = cfg.accountsEmail;
    if (process.env.SMTP_USER && process.env.SMTP_PASS && to) {
      try {
        await transporter.sendMail({
          from: `"G and J Freight Payments" <${process.env.SMTP_USER}>`,
          to,
          replyTo: email,
          subject: `Payment notice (${String(method).toUpperCase()}) — ${
            trackingNumber || reference || notice.id
          }`,
          html: `
            <p>A customer reported a manual payment.</p>
            <ul>
              <li>Notice ID: ${escapeHtml(notice.id)}</li>
              <li>Method: ${escapeHtml(method)}</li>
              <li>Email: ${escapeHtml(email)}</li>
              <li>Amount (GHS): ${escapeHtml(String(amount || '—'))}</li>
              <li>Tracking / invoice: ${escapeHtml(trackingNumber || '—')}</li>
              <li>Their reference: ${escapeHtml(reference || '—')}</li>
              <li>Note: ${escapeHtml(note || '—')}</li>
            </ul>
            <p>Please confirm in MoMo / bank statement before releasing cargo.</p>
          `,
        });
        emailed = true;
      } catch (err) {
        console.error('[Payments] notify email failed:', err.message);
      }
    }

    const waText = [
      'Hello G and J Freight — I have paid.',
      `Notice: ${notice.id}`,
      `Method: ${method}`,
      `Email: ${email}`,
      amount != null ? `Amount: GHS ${amount}` : null,
      trackingNumber ? `Invoice/tracking: ${trackingNumber}` : null,
      reference ? `Reference: ${reference}` : null,
      note ? `Note: ${note}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const whatsappUrl = `https://wa.me/${cfg.momo.number}?text=${encodeURIComponent(waText)}`;

    res.status(200).json({
      success: true,
      noticeId: notice.id,
      emailed,
      whatsappUrl,
      message: emailed
        ? 'Thanks — accounts has been emailed. We will confirm your payment shortly.'
        : 'Payment notice saved. If email is unavailable, tap WhatsApp to alert accounts now.',
    });
  }
);

// GET /api/portal/carriers/status
router.get('/carriers/status', (_req, res) => {
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
