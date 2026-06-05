// routes/contact.js
// Handles contact-form submissions:
//   1. Validates input (via middleware/validate.js)
//   2. Sends a notification email to G&J staff
//   3. Sends an auto-reply confirmation to the enquirer

const express    = require('express');
const router     = express.Router();
const transporter = require('../config/mailer');
const { contactRules, handleValidationErrors } = require('../middleware/validate');
const { contactLimiter } = require('../middleware/rateLimiter');

// ── Helper: build the staff notification email ────────────────────────────────
function buildStaffEmail(data) {
  const { firstName, lastName, email, phone, service, message } = data;
  return {
    from:    `"G&J Website" <${process.env.SMTP_USER}>`,
    to:      process.env.CONTACT_RECEIVER,
    subject: `New Enquiry from ${firstName} ${lastName} – G&J Freight`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:6px;overflow:hidden;">
        <div style="background:#0d1b2a;padding:24px 32px;">
          <h2 style="color:#c9a227;margin:0;font-size:1.4rem;letter-spacing:2px;text-transform:uppercase;">
            New Website Enquiry
          </h2>
          <p style="color:#aaa;margin:4px 0 0;font-size:0.85rem;">G and J Freight Services Limited</p>
        </div>
        <div style="padding:32px;background:#fff;color:#333;">
          <table style="width:100%;border-collapse:collapse;font-size:0.95rem;">
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;width:160px;">Full Name</td>
              <td style="padding:10px 0;border-bottom:1px solid #eee;">${firstName} ${lastName}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;">Email</td>
              <td style="padding:10px 0;border-bottom:1px solid #eee;"><a href="mailto:${email}" style="color:#1e3a5f;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;">Phone</td>
              <td style="padding:10px 0;border-bottom:1px solid #eee;">${phone || '—'}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;">Service</td>
              <td style="padding:10px 0;border-bottom:1px solid #eee;">${service || '—'}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;font-weight:600;vertical-align:top;">Message</td>
              <td style="padding:10px 0;white-space:pre-wrap;">${message}</td>
            </tr>
          </table>
        </div>
        <div style="background:#f4f1ec;padding:16px 32px;font-size:0.8rem;color:#888;">
          Sent from the G&J Freight Services website contact form · ${new Date().toUTCString()}
        </div>
      </div>
    `,
  };
}

// ── Helper: build the auto-reply to the enquirer ─────────────────────────────
function buildAutoReplyEmail(data) {
  const { firstName, email } = data;
  return {
    from:    `"G and J Freight Services" <${process.env.SMTP_USER}>`,
    to:      email,
    subject: 'We received your enquiry – G and J Freight Services',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:6px;overflow:hidden;">
        <div style="background:#0d1b2a;padding:24px 32px;">
          <h2 style="color:#c9a227;margin:0;font-size:1.4rem;letter-spacing:2px;text-transform:uppercase;">
            G and J Freight Services
          </h2>
          <p style="color:#aaa;margin:4px 0 0;font-size:0.85rem;">Your trusted freight forwarding partner</p>
        </div>
        <div style="padding:32px;background:#fff;color:#333;line-height:1.7;">
          <p style="font-size:1rem;">Dear <strong>${firstName}</strong>,</p>
          <p>Thank you for reaching out to <strong>G and J Freight Services Limited</strong>. We have received your enquiry and a member of our team will get back to you within <strong>24 hours</strong> on business days.</p>
          <p>In the meantime, feel free to reach us directly:</p>
          <ul style="padding-left:1.2rem;color:#555;">
            <li>📞 +233 (0) 24 433 3374</li>
            <li>📞 +233 (0) 24 583 9831</li>
            <li>✉️ info@gandjfreightservices.com</li>
          </ul>
          <p style="margin-top:1.5rem;">
            Warm regards,<br/>
            <strong style="color:#0d1b2a;">The G &amp; J Team</strong><br/>
            <span style="font-size:0.85rem;color:#888;">Ground Floor, Kpodo Plaza, Tema Comm 4, Accra – Ghana</span>
          </p>
        </div>
        <div style="background:#f4f1ec;padding:16px 32px;font-size:0.8rem;color:#888;text-align:center;">
          © ${new Date().getFullYear()} G and J Freight Services Limited · <a href="mailto:info@gandjfreightservices.com" style="color:#c9a227;">info@gandjfreightservices.com</a>
        </div>
      </div>
    `,
  };
}

// ── POST /api/contact ─────────────────────────────────────────────────────────
router.post(
  '/',
  contactLimiter,
  contactRules,
  handleValidationErrors,
  async (req, res) => {
    const { firstName, lastName, email, phone, service, message } = req.body;

    try {
      // Send both emails concurrently
      await Promise.all([
        transporter.sendMail(buildStaffEmail({ firstName, lastName, email, phone, service, message })),
        transporter.sendMail(buildAutoReplyEmail({ firstName, email })),
      ]);

      console.log(`[Contact] Enquiry from ${email} sent successfully.`);
      return res.status(200).json({
        success: true,
        message: 'Your message has been sent. We will be in touch shortly.',
      });
    } catch (err) {
      console.error('[Contact] Email send error:');
      console.error(err);
      return res.status(500).json({
        success: false,
        message: 'We could not send your message right now. Please try again or call us directly.',
      });
    }
  }
);

module.exports = router;
