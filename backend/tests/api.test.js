const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX = '10000';
process.env.ALLOWED_ORIGINS = 'http://localhost:4000';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASS = 'x';
process.env.CONTACT_RECEIVER = 'recv@example.com';
process.env.ADMIN_TOKEN = 'test-admin-token';

const sent = [];
jest.mock('../config/mailer', () => ({
  sendMail: jest.fn(async (opts) => {
    sent.push(opts);
    return { messageId: 'mock' };
  }),
  verify: jest.fn((cb) => cb && cb(null)),
}));

const app = require('../server');
const { escapeHtml } = require('../utils/escapeHtml');
const { findShipment } = require('../utils/shipmentsStore');

beforeEach(() => {
  sent.length = 0;
});

describe('escapeHtml', () => {
  test('escapes dangerous characters', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
    expect(escapeHtml('"&\'')).toBe('&quot;&amp;&#39;');
  });
});

describe('GET /api/health', () => {
  test('returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('ok');
  });
});

describe('GET /api/services', () => {
  test('lists six services', async () => {
    const res = await request(app).get('/api/services');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(6);
  });

  test('returns 404 for unknown service', async () => {
    const res = await request(app).get('/api/services/nope');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/company', () => {
  test('returns company profile', async () => {
    const res = await request(app).get('/api/company');
    expect(res.status).toBe(200);
    expect(res.body.data.name).toMatch(/G and J/);
  });
});

describe('POST /api/contact', () => {
  const valid = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+233 24 000 0000',
    service: 'Haulage',
    origin: 'Shanghai',
    destination: 'Tema',
    mode: 'sea',
    cargoType: 'FCL 20ft',
    weightKg: '1200',
    volumeCbm: '28',
    message: 'I need a quote for a 20ft container from China to Tema.',
    captchaAnswer: '7',
    captchaExpected: '7',
    website: '',
  };

  test('rejects empty body', async () => {
    const res = await request(app).post('/api/contact').send({});
    expect(res.status).toBe(422);
  });

  test('rejects honeypot spam', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ ...valid, website: 'http://spam.example' });
    expect(res.status).toBe(422);
  });

  test('rejects bad captcha', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ ...valid, captchaAnswer: '1', captchaExpected: '9' });
    expect(res.status).toBe(422);
  });

  test('accepts valid enquiry and escapes HTML in email', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({
        ...valid,
        firstName: '<script>alert(1)</script>',
        message: 'Hello <img src=x onerror=alert(1)> world!!',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.leadId).toMatch(/^LEAD-/);
    expect(sent).toHaveLength(2);
    const html = (sent[0].html || '') + (sent[1].html || '');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x onerror=');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('GET /api/tracking', () => {
  test('finds demo shipment', async () => {
    const res = await request(app).get('/api/tracking/GJ-2026-00142');
    expect(res.status).toBe(200);
    expect(res.body.data.trackingNumber).toBe('GJ-2026-00142');
    expect(findShipment('gj-2026-00142')).toBeTruthy();
  });

  test('returns carrier links for unknown container-like id', async () => {
    const res = await request(app)
      .get('/api/tracking/live')
      .query({ number: 'MSKU1234567' })
      .timeout({ deadline: 15000 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.links)).toBe(true);
    expect(res.body.links.length).toBeGreaterThan(0);
  }, 20000);

  test('lists carriers', async () => {
    const res = await request(app).get('/api/tracking/carriers');
    expect(res.status).toBe(200);
    expect(res.body.data.some((c) => c.id === 'maersk')).toBe(true);
    expect(res.body.data.some((c) => c.id === 'msc')).toBe(true);
    expect(res.body.data.some((c) => c.id === 'cma-cgm')).toBe(true);
  });
});

describe('Admin CRM', () => {
  test('rejects without token', async () => {
    const res = await request(app).get('/api/admin/leads');
    expect(res.status).toBe(401);
  });

  test('lists leads with token', async () => {
    const res = await request(app)
      .get('/api/admin/leads')
      .set('Authorization', 'Bearer test-admin-token');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('Portal scaffolds', () => {
  test('payment methods', async () => {
    const res = await request(app).get('/api/portal/payments/methods');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('payment intent is not implemented', async () => {
    const res = await request(app)
      .post('/api/portal/payments/intent')
      .send({ trackingNumber: 'GJ-2026-00142', method: 'momo-mtn', amount: 100 });
    expect(res.status).toBe(501);
  });
});

describe('Static assets', () => {
  test('serves sitemap.xml', async () => {
    const res = await request(app).get('/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.text).toContain('urlset');
  });

  test('serves homepage', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('G and J Freight');
  });

  test('serves track page', async () => {
    const res = await request(app).get('/track.html');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Track your');
  });

  test('missing .xml-like path does not SPA-fallback HTML without extension handling', async () => {
    const res = await request(app).get('/missing-file.xyz');
    expect(res.status).toBe(404);
  });
});

describe('CORS', () => {
  test('allows configured origin', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:4000');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:4000');
  });
});

describe('POST /api/alerts/subscribe', () => {
  test('enables alerts and sends confirmation', async () => {
    const res = await request(app)
      .post('/api/alerts/subscribe')
      .send({
        trackingNumber: 'MSCU1234567',
        email: 'shipper@example.com',
        phone: '+233244000000',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(sent.some((m) => m.to === 'shipper@example.com')).toBe(true);
  });

  test('rejects invalid email', async () => {
    const res = await request(app)
      .post('/api/alerts/subscribe')
      .send({ trackingNumber: 'MSCU1234567', email: 'not-an-email' });
    expect(res.status).toBe(422);
  });
});

describe('Admin CRM polish', () => {
  test('stats include reminders', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', 'Bearer test-admin-token');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.reminders)).toBe(true);
  });

  test('can assign and note a lead', async () => {
    const list = await request(app)
      .get('/api/admin/leads')
      .set('Authorization', 'Bearer test-admin-token');
    if (!list.body.data || !list.body.data.length) return;
    const id = list.body.data[0].id;
    const res = await request(app)
      .patch('/api/admin/leads/' + id)
      .set('Authorization', 'Bearer test-admin-token')
      .send({ assignedTo: 'Ama Ops', notes: 'Called client' });
    expect(res.status).toBe(200);
    expect(res.body.data.assignedTo).toBe('Ama Ops');
    expect(res.body.data.notes).toBe('Called client');
  });
});
