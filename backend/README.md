# G and J Freight Services – Backend

Node.js / Express backend for the G and J Freight Services Limited website.

---

## Project Structure

```
gandjfreight/
├── config/
│   └── mailer.js          # Nodemailer SMTP transporter
├── middleware/
│   ├── rateLimiter.js     # Global + contact-form rate limiters
│   └── validate.js        # express-validator rules & error handler
├── routes/
│   ├── api.js             # GET /api/health, /api/services, /api/company
│   └── contact.js         # POST /api/contact (sends emails)
├── public/
│   └── index.html         # ← place your front-end file here
├── .env.example           # copy to .env and fill in values
├── package.json
├── server.js              # main entry point
└── README.md
```

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your SMTP credentials and settings
```

### 3. Add the front-end
```bash
# Copy the HTML file into the public/ folder so Express serves it
cp /path/to/index.html public/
```

### 4. Run the server

**Development** (auto-reload on save):
```bash
npm run dev
```

**Production**:
```bash
npm start
```

The server starts at `http://localhost:3000` (or the PORT in your `.env`).

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/services` | List all 6 services |
| GET | `/api/services/:id` | Single service by ID |
| GET | `/api/company` | Company info, contacts, vision/mission |
| POST | `/api/contact` | Submit contact form (sends email) |

### POST /api/contact – Request Body

```json
{
  "firstName": "John",
  "lastName":  "Doe",
  "email":     "john@example.com",
  "phone":     "+233 24 000 0000",
  "service":   "Air & Sea Freight",
  "message":   "I need a quote for a 20ft container from China."
}
```

### Success Response
```json
{ "success": true, "message": "Your message has been sent. We will be in touch shortly." }
```

### Validation Error Response (422)
```json
{
  "success": false,
  "message": "Validation failed.",
  "errors":  [{ "field": "email", "message": "Please enter a valid email address." }]
}
```

---

## Email Setup (Gmail)

1. Enable **2-Step Verification** on your Google account.
2. Generate an **App Password**: Google Account → Security → App Passwords.
3. Set in `.env`:
   ```
   SMTP_USER=your_gmail@gmail.com
   SMTP_PASS=your_16_char_app_password
   ```

For other providers (Outlook, SendGrid, Mailgun) update `SMTP_HOST` and `SMTP_PORT` accordingly.

---

## Connecting the Front-End

The contact form in `index.html` uses plain HTML with a JavaScript `fetch` call. Update the `handleSubmit` function in `index.html`:

```js
async function handleSubmit(e) {
  e.preventDefault();
  const payload = {
    firstName: document.getElementById('fname').value,
    lastName:  document.getElementById('lname').value,
    email:     document.getElementById('email').value,
    phone:     document.getElementById('phone').value,
    service:   document.getElementById('service').value,
    message:   document.getElementById('message').value,
  };

  try {
    const res  = await fetch('/api/contact', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    document.getElementById('formFeedback').textContent = data.message;
    document.getElementById('formFeedback').style.display = 'block';
    if (res.ok) e.target.reset();
  } catch {
    document.getElementById('formFeedback').textContent =
      'Network error. Please try again.';
    document.getElementById('formFeedback').style.display = 'block';
  }
}
```

---

## Deployment (Ubuntu / VPS)

```bash
# Install Node.js (v18 LTS recommended)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Clone / upload your project, then:
cd gandjfreight
npm install --omit=dev
cp .env.example .env   # fill in production values

# Start with PM2
pm2 start server.js --name gandjfreight
pm2 save
pm2 startup            # auto-start on reboot
```

For HTTPS, place Nginx in front as a reverse proxy and use Certbot for a free SSL certificate.
