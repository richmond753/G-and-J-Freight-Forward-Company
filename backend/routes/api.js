// routes/api.js
// General read-only API endpoints:
//   GET /api/health        – server health check
//   GET /api/services      – list of all services
//   GET /api/company       – company info (address, phones, emails)

const express = require('express');
const router  = express.Router();

// ── Static data (in a real app this would come from a database) ───────────────
const SERVICES = [
  {
    id:          'air-sea-freight',
    title:       'Air & Sea Freight',
    icon:        '✈️',
    description: 'Full NVOCC and innovative Air and Sea freight services to local and international companies. We understand the importance of providing a reliable and consistent international freight service.',
  },
  {
    id:          'import-export',
    title:       'Import & Export',
    icon:        '🚢',
    description: 'We provide import and export services to local and international companies using the most price-effective method.',
  },
  {
    id:          'warehousing',
    title:       'Warehousing',
    icon:        '🏭',
    description: 'We provide open space warehouse with a warehouse management system to warehouse your cargo as well as collateral management.',
  },
  {
    id:          'consolidator',
    title:       'Consolidator',
    icon:        '📦',
    description: 'Your trusted shipping partner. We consolidate, manage and deliver your cargo with precision and care ensuring efficiency, affordability and peace of mind.',
  },
  {
    id:          'haulage',
    title:       'Haulage',
    icon:        '🚛',
    description: 'G and J Freight Services manages the movement of your cargo from port to port, from port to door and from door to door.',
  },
  {
    id:          'consultancy',
    title:       'Consultancy',
    icon:        '💼',
    description: 'We offer professional consulting service in all areas in freight & forwarding. We give you the best and detailed view in all your requests.',
  },
];

const COMPANY = {
  name:       'G and J Freight Services Limited',
  founded:    2008,
  type:       'Freight Forwarder & NVOCC',
  offices: [
    {
      label:   'Head Office',
      address: 'Ground Floor, Kpodo Plaza, Opposite Creator School, Tema Comm 4, Accra – Ghana',
    },
    {
      label:   'Branch Office',
      address: 'Tema, Comm 5 – Behind Last Hour',
    },
  ],
  phones: [
    '+233 (0) 24 433 3374',
    '+233 (0) 24 583 9831',
    '+233 (0) 20 749 9123',
    '+233 (0) 57 079 3888',
  ],
  emails: [
    'info@gandjfreightservices.com',
    'gandjfreight23@gmail.com',
  ],
  vision:  'To be a world class brand providing the safest and most customer-focused freight forwarding services on a global scale.',
  mission: 'To develop innovative logistics solutions that are economical, convenient and personalised to suit your needs and demands.',
  values:  ['Productive', 'Innovative', 'Determined', 'Teamwork'],
};

// ── GET /api/health ───────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status:  'ok',
    uptime:  process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── GET /api/services ─────────────────────────────────────────────────────────
router.get('/services', (req, res) => {
  res.status(200).json({ success: true, count: SERVICES.length, data: SERVICES });
});

// ── GET /api/services/:id ─────────────────────────────────────────────────────
router.get('/services/:id', (req, res) => {
  const service = SERVICES.find(s => s.id === req.params.id);
  if (!service) {
    return res.status(404).json({ success: false, message: 'Service not found.' });
  }
  res.status(200).json({ success: true, data: service });
});

// ── GET /api/company ──────────────────────────────────────────────────────────
router.get('/company', (req, res) => {
  res.status(200).json({ success: true, data: COMPANY });
});

module.exports = router;
