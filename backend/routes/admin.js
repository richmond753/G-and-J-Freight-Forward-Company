// routes/admin.js
// Staff CRM / lead inbox (requires ADMIN_TOKEN)

const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/adminAuth');
const { listLeads, getLead, updateLead } = require('../utils/leadsStore');

router.use(requireAdmin);

// GET /api/admin/leads
router.get('/leads', (req, res) => {
  const leads = listLeads({ status: req.query.status });
  res.status(200).json({ success: true, count: leads.length, data: leads });
});

// GET /api/admin/leads/:id
router.get('/leads/:id', (req, res) => {
  const lead = getLead(req.params.id);
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found.' });
  res.status(200).json({ success: true, data: lead });
});

// PATCH /api/admin/leads/:id
router.patch('/leads/:id', (req, res) => {
  const allowed = ['status', 'assignedTo', 'notes'];
  const patch = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) patch[key] = String(req.body[key]).slice(0, 2000);
  }
  if (patch.status) {
    const ok = ['new', 'contacted', 'quoted', 'won', 'lost', 'archived'];
    if (!ok.includes(patch.status)) {
      return res.status(422).json({ success: false, message: 'Invalid status.' });
    }
  }
  const updated = updateLead(req.params.id, patch);
  if (!updated) return res.status(404).json({ success: false, message: 'Lead not found.' });
  res.status(200).json({ success: true, data: updated });
});

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  const leads = listLeads();
  const byStatus = leads.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});
  res.status(200).json({
    success: true,
    data: {
      total: leads.length,
      byStatus,
      latest: leads.slice(0, 5).map((l) => ({
        id: l.id,
        name: `${l.firstName} ${l.lastName}`,
        status: l.status,
        createdAt: l.createdAt,
      })),
    },
  });
});

module.exports = router;
