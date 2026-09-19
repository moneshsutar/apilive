require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth');
const plansRoutes = require('./routes/plans');
const subscriptionsRoutes = require('./routes/subscriptions');
const paymentsRoutes = require('./routes/payments');
const webhooksRoutes = require('./routes/webhooks');
const adminRoutes = require('./routes/admin');
const cronRoutes = require('./routes/cron');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Headers ───────────────────────────────────────
app.use(helmet());

// ─── CORS ────────────────────────────────────────────────────
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
    credentials: true,
  })
);

// // ─── Rate Limiting ──────────────────────────────────────────
// const limiter = rateLimit({
//   windowMs: 60 * 1000, // 1 minute
//   max: 100, // 100 requests per minute per IP
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: {
//     error: 'Too Many Requests',
//     message: 'Rate limit exceeded. Please try again later.',
//   },
// });

// app.use(limiter);

// // Stricter rate limit for auth endpoints
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 20, // 20 requests per 15 minutes
//   message: {
//     error: 'Too Many Requests',
//     message: 'Too many authentication attempts. Please try again later.',
//   },
// });

// // Stricter rate limit for payment webhook
// const webhookLimiter = rateLimit({
//   windowMs: 60 * 1000,
//   max: 50,
// });

// ─── Body Parsing ───────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ───────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ─── Routes ─────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cron', cronRoutes);

// ─── 404 Handler ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// ─── Global Error Handler ───────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// ─── Start Server ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ✦ API Results Platform — Backend`);
  console.log(`  ✦ Server running on http://localhost:${PORT}`);
  console.log(`  ✦ Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
