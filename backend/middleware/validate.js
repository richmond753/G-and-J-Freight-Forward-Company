// middleware/validate.js
// Validation rules for the contact-form endpoint.
// Uses express-validator so errors are caught before any business logic runs.

const { body, validationResult } = require('express-validator');

const MODES = ['sea', 'air', 'road', 'rail', 'multimodal', ''];

// ── Validation rules ──────────────────────────────────────────────────────────
const contactRules = [
  // Honeypot — must be empty (bots fill hidden fields)
  body('website')
    .optional({ values: 'falsy' })
    .isEmpty()
    .withMessage('Spam detected.'),

  // Simple math captcha: captchaAnswer must equal captchaExpected
  body('captchaAnswer')
    .trim()
    .notEmpty()
    .withMessage('Please solve the security check.')
    .custom((value, { req }) => {
      const expected = String(req.body.captchaExpected ?? '').trim();
      if (!expected || String(value).trim() !== expected) {
        throw new Error('Security check failed. Please try again.');
      }
      return true;
    }),

  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required.')
    .isLength({ max: 80 }).withMessage('First name must be 80 characters or fewer.'),

  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required.')
    .isLength({ max: 80 }).withMessage('Last name must be 80 characters or fewer.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail(),

  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[\d\s\+\-\(\)]{7,20}$/)
    .withMessage('Please enter a valid phone number.'),

  body('service')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Service field is too long.'),

  // Structured quote fields
  body('origin')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 120 }).withMessage('Origin must be 120 characters or fewer.'),

  body('destination')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 120 }).withMessage('Destination must be 120 characters or fewer.'),

  body('mode')
    .optional({ checkFalsy: true })
    .trim()
    .toLowerCase()
    .isIn(MODES)
    .withMessage('Please select a valid transport mode.'),

  body('cargoType')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 120 }).withMessage('Cargo type must be 120 characters or fewer.'),

  body('weightKg')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d+(\.\d{1,2})?$/)
    .withMessage('Weight must be a number (kg).'),

  body('volumeCbm')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d+(\.\d{1,2})?$/)
    .withMessage('Volume must be a number (CBM).'),

  body('message')
    .trim()
    .notEmpty().withMessage('Message is required.')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters.'),
];

// ── Error-handler middleware (call after rules) ───────────────────────────────
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

module.exports = { contactRules, handleValidationErrors };
