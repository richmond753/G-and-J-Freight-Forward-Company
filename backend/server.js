// server.js
// Entry point for the G and J Freight Services backend.
// Run:  node server.js          (production)
//       nodemon server.js       (development with auto-reload)

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const apiRouter = require('./routes/api');
const contactRouter = require('./routes/contact');
const trackingRouter = require('./routes/tracking');
const adminRouter = require('./routes/admin');
const portalRouter = require('./routes/portal');
const { globalLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://translate.google.com',
          'https://translate.googleapis.com',
          'https://www.gstatic.com',
          'https://*.gstatic.com',
          'https://www.google.com',
          'https://*.googleapis.com',
          'https://fonts.googleapis.com',
          'https://embed.tawk.to',
          'https://*.tawk.to',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://www.gstatic.com',
          'https://translate.googleapis.com',
          'https://embed.tawk.to',
          'https://*.tawk.to',
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://www.gstatic.com', 'https://*.tawk.to', 'data:'],
        imgSrc: [
          "'self'",
          'data:',
          'https://images.unsplash.com',
          'https://www.gstatic.com',
          'https://translate.googleapis.com',
          'https://translate.google.com',
          'https://*.gstatic.com',
          'https://*.google.com',
          'https://*.googleapis.com',
          'https://*.ggpht.com',
          'https://*.googleusercontent.com',
          'https://*.tawk.to',
          'https://tawk.link',
        ],
        connectSrc: [
          "'self'",
          'https://translate.googleapis.com',
          'https://translate.google.com',
          'https://*.googleapis.com',
          'https://*.google.com',
          'https://*.gstatic.com',
          'https://api.maersk.com',
          'https://shipsgo.com',
          'https://*.tawk.to',
          'wss://*.tawk.to',
        ],
        frameSrc: [
          "'self'",
          'https://www.google.com',
          'https://maps.google.com',
          'https://translate.google.com',
          'https://*.google.com',
          'https://*.tawk.to',
        ],
      },
    },
  })
);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Same-origin browser requests and static pages often omit Origin.
      // In production, only allow listed origins when Origin is present;
      // no-Origin is allowed for same-origin navigations and server-to-server tools.
      if (!origin) {
        if (!isProd || process.env.ALLOW_NO_ORIGIN === 'true') {
          return callback(null, true);
        }
        // Production: allow no-Origin (curl/health checks / same-origin form posts)
        // but do not reflect arbitrary origins.
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin "${origin}" not allowed.`));
    },
    methods: ['GET', 'POST', 'PATCH'],
    credentials: true,
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(isProd ? 'combined' : 'dev'));
}

app.use(globalLimiter);

app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.use('/api', apiRouter);
app.use('/api/contact', contactRouter);
app.use('/api/tracking', trackingRouter);
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/admin', adminRouter);
app.use('/api/portal', portalRouter);

// Explicit HTML pages (avoid SPA catch-all masking missing assets)
const pages = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/track': 'track.html',
  '/track.html': 'track.html',
  '/admin': 'admin.html',
  '/admin.html': 'admin.html',
  '/portal': 'portal.html',
  '/portal.html': 'portal.html',
};

Object.entries(pages).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', file));
  });
});

// Do NOT fall back to index.html for missing files with extensions
// (sitemap.xml, robots.txt, images, css, js must 404 if absent).
app.get('*', (req, res) => {
  if (path.extname(req.path)) {
    return res.status(404).json({ success: false, message: 'Not found.' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, _next) => {
  console.error('[Error]', err.message);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: isProd ? 'An unexpected error occurred.' : err.message,
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\nG and J Freight Services server running`);
    console.log(`   -> http://localhost:${PORT}`);
    console.log(`   -> ENV: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

module.exports = app;
