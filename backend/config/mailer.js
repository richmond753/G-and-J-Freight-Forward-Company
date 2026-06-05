// config/mailer.js
// Creates and exports a reusable Nodemailer transporter.
// All credentials are read from environment variables (never hard-coded).

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // true → port 465, false → STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify connection on startup (logs a warning in dev, doesn't crash the app)
if (process.env.NODE_ENV !== 'test') {
  transporter.verify((err) => {
    if (err) {
      console.warn('[Mailer] SMTP connection warning:');
      console.error(err);
    } else {
      console.log('[Mailer] SMTP connection verified ✓');
    }
  });
}

module.exports = transporter;
