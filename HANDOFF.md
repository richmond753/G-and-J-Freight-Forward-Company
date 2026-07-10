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
