# G and J Freight — Handoff Guide

Live site: https://g-and-j-freight-forward-company.onrender.com  
GitHub: https://github.com/richmond753/G-and-J-Freight-Forward-Company

This site is ready as the company website for quotes, MoMo payments, tracking, documents, haulage status, guides, and a staff lead inbox. Some features wait on company details (bank account, Paystack, real customer logins).

---

## 1. Confirm these on Render (required)

In Render → your web service → **Environment**, make sure these are set:

| Variable | Purpose |
|----------|---------|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Sends quote / contact emails |
| `CONTACT_RECEIVER` | Where enquiries land (e.g. info@…) |
| `ADMIN_TOKEN` | Password to unlock staff CRM |
| `ALLOWED_ORIGINS` | Include your live URL(s) |
| `PUBLIC_SITE_URL` | `https://g-and-j-freight-forward-company.onrender.com` |

Optional but already defaulted for MoMo:

```
MOMO_NUMBERS=233244333374,233245839831,233207499123,233570793888
MOMO_ACCOUNT_NAME=G and J Freight Services
```

After changing env vars, Render redeploys automatically.

---

## 2. Add later (when company provides details)

### Bank transfer (shows on `/pay.html`)
```
BANK_NAME=...
BANK_ACCOUNT_NAME=...
BANK_ACCOUNT_NUMBER=...
BANK_BRANCH=Tema
```

### Paystack online MoMo + card
1. Create account at https://dashboard.paystack.com  
2. Complete business KYC  
3. Copy **Public key** (`pk_…`) and **Secret key** (`sk_…`)  
4. Add on Render:
```
PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_SECRET_KEY=sk_test_...
```
Start with test keys, then switch to live keys after KYC.

### Real customer accounts
Demo login today: `demo@gandjfreight.com` / `Demo1234!`  
Replace with real accounts when ops can supply customer emails and shipment history.

---

## 3. Quick walkthrough (show the company)

| Page | URL | Who uses it |
|------|-----|-------------|
| Home / quote | `/` | Public |
| Track | `/track.html` | Customers |
| Pay (MoMo / bank / Paystack) | `/pay.html` | Customers / accounts |
| Upload docs (BL, invoice, packing list) | `/docs.html` | Customers |
| Haulage status | `/haulage.html` | Customers / drivers |
| Customer login | `/account.html` | Customers |
| Guides | `/guides.html` | Public |
| Portal hub | `/portal.html` | Customers |
| Staff CRM (leads) | `/admin.html` | Staff only — needs `ADMIN_TOKEN` |

**Staff CRM:** open `/admin.html` → enter `ADMIN_TOKEN` → review website enquiries.  
**Driver updates:** `/haulage.html` → Driver update section → PIN = `HAULAGE_PIN` or `ADMIN_TOKEN`. Demo trip: `TRIP-TEMA-001`.

---

## 4. Photos (optional improvement)

When they have real Tema office / yard photos, drop files into:

`backend/public/images/`

See `backend/public/images/README.txt` for suggested filenames. Do **not** rename paths that already work on the homepage unless replacing carefully.

---

## 5. What is already working without bank/Paystack

- Company website and quote form  
- Four MoMo payment numbers on `/pay.html` and Contact  
- “I have paid” notices (saved + WhatsApp fallback)  
- Tracking, document upload, haulage, guides  
- Staff lead inbox  
- Customer account demo  

---

## 6. Handoff checklist for the company

- [ ] Confirm SMTP email is receiving test quotes  
- [ ] Confirm staff can open `/admin.html` with `ADMIN_TOKEN`  
- [ ] Confirm MoMo numbers on `/pay.html` are correct  
- [ ] Provide bank account details for Render `BANK_*`  
- [ ] Create Paystack account when ready for online card/MoMo  
- [ ] Provide real photos when available  
- [ ] Decide who owns Render + GitHub access going forward  

---

*Built for G and J Freight Services Limited — Tema, Ghana.*

---

## Google Hosting (Firebase Hosting)

The public pages can be served on Firebase Hosting's no-cost Spark plan. The
customer-data API remains on Render because it currently persists leads,
documents, and other records on local disk; moving that API to an ephemeral
Google container without first migrating its storage could lose customer data.

Firebase provides a `*.web.app` address at no hosting charge within its free
limits. A root/custom domain such as `gandjfreightservices.com` can also point
to Firebase at no extra hosting charge, but the domain itself must already be
registered and owned by the company. If it is not, domain registration is an
additional cost; Firebase does not provide free root domains.

To publish the static pages after signing in with the company's Google account:

1. Create or select a Firebase project and choose its Hosting site.
2. From the repository root, run `npx firebase-tools login`.
3. Set the Render service's `ALLOWED_ORIGINS` to include the Firebase site
   origin and any verified custom domain, preserving any existing allowed
   origins. Save the setting and wait for Render to redeploy.
4. Run `npx firebase-tools deploy --only hosting --project <firebase-project-id>`.
5. To use the company's root domain, add it in Firebase Console → Hosting →
   Add custom domain, then apply the exact DNS records Firebase provides.

The frontend routes API requests to the existing Render service when served
from Firebase. Keep both origins in use until the API's data and uploaded files
have been migrated to persistent Google services and verified.
