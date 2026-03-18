/**
 * app.js
 * M365 Security Lab — Zero Trust Hardened Express Server
 *
 * Security layers:
 *  1. Helmet.js with hardened CSP
 *  2. AI Agent / Bot detection (aiAgentDefense.js)
 *  3. Token replay prevention
 *  4. Strict CORS
 *  5. Tiered rate limiting (global + per-route + geo-aware)
 *  6. Request fingerprinting & anomaly detection
 *  7. Prompt injection & agentic chain detection
 *  8. Geo-aware throttling (cloud/AI provider IP tiers)
 *  9. Joi environment validation
 * 10. Structured security audit logging
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const cors = require('cors');
const logger = require('./logger');
const { authenticate, authorize } = require('./authMiddleware');
const {
  detectAIAgent,
  detectVelocityAbuse,
  preventTokenReplay,
  addSecurityHeaders,
} = require('./aiAgentDefense');
const {
  detectPromptInjection,
  detectAgenticChain,
  detectFingerprintAnomaly,
} = require('./promptInjectionDefense');
const { geoThrottle, flagIP } = require('./geoThrottle');

const app = express();

// ─── Environment Validation ───────────────────────────────────────────────────
const envSchema = Joi.object({
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  CLIENT_ID: Joi.string().uuid().required(),
  CLIENT_SECRET: Joi.string().min(8).required(),
  TENANT_ID: Joi.string().uuid().required(),
  REDIRECT_URI: Joi.string().uri().required(),
  ADMIN_GROUP_ID: Joi.string().uuid().required(),
  MANAGER_GROUP_ID: Joi.string().uuid().required(),
  EMPLOYEE_GROUP_ID: Joi.string().uuid().required(),
  ALLOWED_ORIGINS: Joi.string().required(),
  LOG_LEVEL: Joi.string().valid('info', 'error', 'warn', 'debug').default('info'),
}).unknown(true);

const { error: envError, value: envVars } = envSchema.validate(process.env);
if (envError) {
  logger.securityEvent('CONFIG_ERROR', { reason: envError.message });
  logger.error(`Config validation error: ${envError.message}`);
  process.exit(1);
}

// ─── Trust Proxy (for accurate IP behind reverse proxy/load balancer) ─────────
app.set('trust proxy', 1);

// ─── Hardened Helmet CSP ──────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'none'"],
        styleSrc: ["'none'"],
        imgSrc: ["'none'"],
        connectSrc: ["'self'"],
        fontSrc: ["'none'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'none'"],
        frameSrc: ["'none'"],
        formAction: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true,
  })
);

// ─── AI/Bot Defense Headers ───────────────────────────────────────────────────
app.use(addSecurityHeaders);

// ─── Strict CORS ──────────────────────────────────────────────────────────────
const allowedOrigins = envVars.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin only in development (e.g., curl, Postman)
      if (!origin && envVars.NODE_ENV === 'development') return callback(null, true);
      if (!origin || !allowedOrigins.includes(origin)) {
        logger.securityEvent('CORS_VIOLATION', { origin: origin || 'none' });
        return callback(new Error('CORS policy violation'), false);
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 600, // Cache preflight for 10 minutes
  })
);

app.use(express.json({ limit: '10kb' })); // Limit request body size

// ─── Global Rate Limiter ──────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too Many Requests', message: 'Rate limit exceeded. Try again later.' },
  handler: (req, res, next, options) => {
    logger.securityEvent('VELOCITY_ABUSE', {
      ip: req.ip,
      path: req.path,
      reason: 'Global rate limit exceeded',
    });
    res.status(options.statusCode).json(options.message);
  },
});
app.use(globalLimiter);

// ─── Strict Auth Route Rate Limiter ──────────────────────────────────────────
// Much tighter limits on authenticated endpoints to prevent enumeration
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too Many Requests', message: 'Auth rate limit exceeded. Try again later.' },
  handler: (req, res, next, options) => {
    logger.securityEvent('VELOCITY_ABUSE', {
      ip: req.ip,
      path: req.path,
      reason: 'Auth route rate limit exceeded',
    });
    res.status(options.statusCode).json(options.message);
  },
});

// ─── Geo-Aware Throttling (applied to all routes) ────────────────────────────
// Applies tiered rate limits based on IP origin (cloud/AI provider vs standard)
app.use(geoThrottle);

// ─── Request Fingerprint Anomaly Detection (all routes) ──────────────────────
// Logs anomalies (missing browser headers, headless UA, etc.) for enrichment
app.use(detectFingerprintAnomaly);

// ─── Prompt Injection & Agentic Chain Detection (all routes) ─────────────────
// Blocks LLM injection payloads and multi-step AI agent enumeration patterns
app.use(detectPromptInjection);
app.use(detectAgenticChain);

// ─── AI Agent Detection (applied to all routes) ───────────────────────────────
app.use(detectAIAgent);

// ─── Routes ───────────────────────────────────────────────────────────────────

// Public health check — no auth, no AI defense bypass
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    environment: envVars.NODE_ENV,
  });
});

// Protected: Requires Authentication
// Apply: velocity check + token replay prevention + auth rate limiter
app.get(
  '/api/profile',
  authLimiter,
  detectVelocityAbuse,
  preventTokenReplay,
  authenticate,
  (req, res) => {
    const claims = req.auth.claims || {};
    res.json({
      message: 'Authentication successful.',
      user: claims.name || req.auth.account?.name || 'unknown',
      username: claims.preferred_username || req.auth.account?.username || 'unknown',
    });
  }
);

// Protected: Requires 'admin' permission
app.get(
  '/api/admin/settings',
  authLimiter,
  detectVelocityAbuse,
  preventTokenReplay,
  authenticate,
  authorize(['*']),
  (req, res) => {
    res.json({ message: 'Welcome, Admin. You have access to system settings.' });
  }
);

// Protected: Requires 'read' permission (Manager or Employee)
app.get(
  '/api/documents',
  authLimiter,
  detectVelocityAbuse,
  preventTokenReplay,
  authenticate,
  authorize(['read']),
  (req, res) => {
    res.json({ message: 'Displaying internal documents.', count: 42 });
  }
);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'The requested resource does not exist.' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.securityEvent('UNHANDLED_ERROR', {
    ip: req.ip,
    path: req.path,
    errorName: err.name,
  });
  logger.error(err.stack);
  // Never expose stack traces or internal error messages in production
  const message =
    envVars.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred.';
  res.status(500).json({ error: 'Internal Server Error', message });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = envVars.PORT;
app.listen(PORT, () => {
  logger.info(`M365 Security Lab (Zero Trust) running on port ${PORT} [${envVars.NODE_ENV}]`);
});
