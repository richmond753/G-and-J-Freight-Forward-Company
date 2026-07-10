// routes/documents.js — customer document upload (BL, invoice, packing list, etc.)

const express = require('express');
const path = require('path');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { contactLimiter } = require('../middleware/rateLimiter');
const {
  DOC_TYPES,
  UPLOAD_DIR,
  ensureStore,
  addDocument,
  listDocuments,
  getDocument,
} = require('../utils/docsStore');

ensureStore();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = String(file.originalname || 'file')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 80);
    cb(null, Date.now() + '-' + safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(pdf|png|jpe?g|doc|docx)$/i.test(file.originalname || '');
    if (!ok) return cb(new Error('Allowed types: PDF, JPG, PNG, DOC, DOCX'));
    cb(null, true);
  },
});

const router = express.Router();

router.get('/types', (_req, res) => {
  res.status(200).json({
    success: true,
    data: DOC_TYPES.map((id) => ({
      id,
      label: id
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
    })),
  });
});

router.get('/', (req, res) => {
  const trackingNumber = req.query.trackingNumber;
  const email = req.query.email;
  if (!trackingNumber && !email) {
    return res.status(400).json({
      success: false,
      message: 'Provide trackingNumber or email to list documents.',
    });
  }
  const data = listDocuments({ trackingNumber, email }).map((d) => ({
    id: d.id,
    trackingNumber: d.trackingNumber,
    docType: d.docType,
    originalName: d.originalName,
    uploadedAt: d.uploadedAt,
    note: d.note || '',
  }));
  res.status(200).json({ success: true, count: data.length, data });
});

router.post(
  '/upload',
  contactLimiter,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        return res.status(422).json({ success: false, message: err.message || 'Upload failed.' });
      }
      next();
    });
  },
  [
    body('trackingNumber').trim().notEmpty().isLength({ max: 40 }),
    body('email').trim().isEmail().normalizeEmail(),
    body('docType').trim().isIn(DOC_TYPES),
    body('note').optional({ checkFalsy: true }).trim().isLength({ max: 300 }),
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
    if (!req.file) {
      return res.status(422).json({ success: false, message: 'Choose a file to upload.' });
    }

    const row = addDocument({
      trackingNumber: String(req.body.trackingNumber).trim().toUpperCase(),
      email: String(req.body.email).trim().toLowerCase(),
      docType: req.body.docType,
      note: req.body.note || '',
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });

    res.status(201).json({
      success: true,
      message: 'Document received. Our operations team will review it.',
      data: {
        id: row.id,
        trackingNumber: row.trackingNumber,
        docType: row.docType,
        originalName: row.originalName,
        uploadedAt: row.uploadedAt,
      },
    });
  }
);

// Staff download by id (admin token) — optional convenience
router.get('/file/:id', (req, res) => {
  const admin = process.env.ADMIN_TOKEN || '';
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.headers['x-admin-token'];
  if (!admin || token !== admin) {
    return res.status(401).json({ success: false, message: 'Admin token required to download.' });
  }
  const doc = getDocument(req.params.id);
  if (!doc) return res.status(404).json({ success: false, message: 'Not found.' });
  const filePath = path.join(UPLOAD_DIR, doc.storedName);
  res.download(filePath, doc.originalName);
});

module.exports = router;
