// middleware/validate.js
// Validation rules for the contact-form endpoint.
// Uses express-validator so errors are caught before any business logic runs.

const { body, validationResult } = require('express-validator');

// ── Validation rules ──────────────────────────────────────────────────────────
const contactRules = [
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
      errors:  errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

module.exports = { contactRules, handleValidationErrors };
