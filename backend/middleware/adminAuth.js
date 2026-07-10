/**
 * Simple bearer-token auth for the staff CRM / admin API.
 * Set ADMIN_TOKEN in .env. Requests must send: Authorization: Bearer <token>
 */
function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return res.status(503).json({
      success: false,
      message: 'Admin access is not configured. Set ADMIN_TOKEN in the environment.',
    });
  }

  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1].trim() : (req.headers['x-admin-token'] || '').trim();

  if (!token || token !== expected) {
    return res.status(401).json({ success: false, message: 'Unauthorized.' });
  }
  next();
}

module.exports = { requireAdmin };
