// server.js
// Entry point for the G and J Freight Services backend.
// Run:  node server.js          (production)
//       nodemon server.js       (development with auto-reload)

require('dotenv').config(); // load .env variables first

const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const morgan  = require('morgan');
const path    = require('path');

const apiRouter     = require('./routes/api');
const contactRouter = require('./routes/contact');
const { globalLimiter } = require('./middleware/rateLimiter');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      // Google Translate widget + Google Maps embed + Tawk.to live chat need these extra hosts
      scriptSrc:   [
        "'self'", "'unsafe-inline'", "'unsafe-eval'",
        'https://translate.google.com', 'https://translate.googleapis.com',
        'https://www.gstatic.com', 'https://www.google.com',
        'https://fonts.googleapis.com',
        'https://embed.tawk.to', 'https://*.tawk.to',
      ],
      styleSrc:    [
        "'self'", "'unsafe-inline'",
        'https://fonts.googleapis.com', 'https://www.gstatic.com',
        'https://translate.googleapis.com',
        'https://embed.tawk.to', 'https://*.tawk.to',
      ],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com', 'https://www.gstatic.com', 'https://*.tawk.to', 'data:'],
      imgSrc:      [
        "'self'", 'data:', 'https://images.unsplash.com',
        'https://www.gstatic.com', 'https://translate.googleapis.com', 'https://translate.google.com',
        'https://*.gstatic.com', 'https://*.google.com', 'https://*.googleapis.com',
        'https://*.ggpht.com', 'https://*.googleusercontent.com',
        'https://*.tawk.to', 'https://tawk.link',
      ],
      connectSrc:  ["'self'", 'https://translate.googleapis.com', 'https://translate.google.com', 'https://*.tawk.to', 'wss://*.tawk.to'],
      frameSrc:    ["'self'", 'https://www.google.com', 'https://maps.google.com', 'https://translate.google.com', 'https://*.tawk.to'],
    },
  },
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman) in development
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin "${origin}" not allowed.`));
  },
  methods:     ['GET', 'POST'],
  credentials: true,
}));

// ── Request parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Logging (skip in test env) ────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Global rate limiter ───────────────────────────────────────────────────────
app.use(globalLimiter);

// ── Serve static files (the front-end HTML/CSS/JS) ───────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api',         apiRouter);
app.use('/api/contact', contactRouter);

// ── SPA fallback – serve index.html for any unmatched route ──────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Error]', err.message);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred.'
      : err.message,
  });
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚢  G and J Freight Services server running`);
  console.log(`   ➜  http://localhost:${PORT}`);
  console.log(`   ➜  ENV: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app; // exported for testing
