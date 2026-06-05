// middleware/rateLimiter.js
// Provides two limiters:
//   • globalLimiter  – applied to every request
//   • contactLimiter – stricter, applied only to POST /api/contact

const rateLimit = require('express-rate-limit');

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 min
const maxGlobal  = parseInt(process.env.RATE_LIMIT_MAX      || '100', 10);
const maxContact = 10; // max 10 contact submissions per window per IP

const globalLimiter = rateLimit({
  windowMs,
  max: maxGlobal,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

const contactLimiter = rateLimit({
  windowMs,
  max: maxContact,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many contact requests. Please wait and try again.' },
});

module.exports = { globalLimiter, contactLimiter };
