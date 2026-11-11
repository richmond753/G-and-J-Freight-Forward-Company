# G and J Freight Services – Backend

Node.js / Express backend for the G and J Freight Services Limited website, tracking portal, staff CRM, and portal scaffolds.

---

## Project Structure

```
backend/
├── config/mailer.js
├── middleware/          # rate limit, validation, admin auth
├── routes/              # api, contact, tracking, admin, portal
├── utils/               # escapeHtml, leadsStore, shipmentsStore
├── data/                # leads.json (runtime, gitignored)
├── public/              # site + track/portal/admin pages
├── tests/api.test.js
├── server.js
└── package.json
```

---

## Quick Start

```bash
npm install
cp .env.example .env   # fill SMTP + ADMIN_TOKEN + ALLOWED_ORIGINS
npm run dev            # http://localhost:3000 (or PORT)
npm test               # Jest + Supertest
```

---

## Pages

| Path | Purpose |
|------|---------|
| `/` | Marketing site + structured quote form |
| `/track.html` | Customer shipment tracking |
| `/portal.html` | Documents / payments / carrier scaffolds |
| `/admin.html` | Staff lead inbox (requires `ADMIN_TOKEN`) |

Demo tracking numbers: `GJ-2026-00142`, `GJ-2026-00098`, `GJ-2026-00055`

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/services` | List services |
| GET | `/api/services/:id` | Single service |
| GET | `/api/company` | Company profile |
| POST | `/api/contact` | Quote / contact (email + CRM lead) |
| GET | `/api/tracking/:number` | Shipment tracking |
| GET | `/api/admin/leads` | CRM leads (Bearer `ADMIN_TOKEN`) |
| PATCH | `/api/admin/leads/:id` | Update lead status |
| GET | `/api/admin/stats` | CRM stats |
| GET | `/api/portal/documents` | Document vault scaffold |
| GET | `/api/portal/payments/methods` | Payment methods scaffold |
| POST | `/api/portal/payments/intent` | Payment capture (501 until wired) |
| GET | `/api/portal/carriers/status` | Carrier integration scaffold |

The Render health check at `/api/health` is exempt from the global API rate limit;
customer-facing endpoints remain rate-limited.

### POST /api/contact body

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+233 24 000 0000",
  "service": "Air & Sea Freight",
  "origin": "Shanghai, CN",
  "destination": "Tema, GH",
  "mode": "sea",
  "cargoType": "FCL 20ft",
  "weightKg": "1200",
  "volumeCbm": "28",
  "message": "Need a quote for next sailing.",
  "captchaAnswer": "7",
  "captchaExpected": "7",
  "website": ""
}
```

`website` is a honeypot and must be empty. Math captcha fields are required.

---

## Security notes

- Contact emails HTML-escape all user fields.
- Helmet, rate limits, CORS allow-list, honeypot + captcha on contact.
- Set a strong `ADMIN_TOKEN` before using `/admin.html`.
- Rotate SMTP app passwords if they were ever exposed.

---

## Deployment (Render)

See root `render.yaml`. Set `SMTP_*`, `CONTACT_RECEIVER`, `ALLOWED_ORIGINS`, and `ADMIN_TOKEN` in the dashboard.
