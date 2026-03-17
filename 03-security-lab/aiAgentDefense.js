/**
 * aiAgentDefense.js
 * Zero Trust AI Agent & Bot Defense Middleware
 *
 * Defends against:
 *  - AI agent / automated bot attacks
 *  - Token replay attacks
 *  - Behavioral anomaly / enumeration
 *  - Suspicious User-Agent patterns
 *  - Request fingerprinting abuse
 */

const logger = require('./logger');

// ─── In-Memory Nonce Store (token replay prevention) ─────────────────────────
// In production, replace with Redis or a distributed cache.
const usedTokenNonces = new Map(); // nonce -> expiry timestamp
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Purge expired nonces every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [nonce, expiry] of usedTokenNonces.entries()) {
    if (now > expiry) usedTokenNonces.delete(nonce);
  }
}, 10 * 60 * 1000);

// ─── Known AI Agent / Bot User-Agent Patterns ────────────────────────────────
const AI_AGENT_PATTERNS = [
  /python-requests/i,
  /aiohttp/i,
  /httpx/i,
  /axios/i,
  /node-fetch/i,
  /got\//i,
  /undici/i,
  /curl\//i,
  /wget\//i,
  /scrapy/i,
  /selenium/i,
  /playwright/i,
  /puppeteer/i,
  /headlesschrome/i,
  /phantomjs/i,
  /openai/i,
  /langchain/i,
  /autogpt/i,
  /agentgpt/i,
  /gpt-agent/i,
  /llm-agent/i,
  /anthropic/i,
  /claude-agent/i,
  /copilot-agent/i,
  /bot\b/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
];

// ─── Per-IP Request Velocity Tracker ─────────────────────────────────────────
const requestVelocity = new Map(); // ip -> { count, windowStart }
const VELOCITY_WINDOW_MS = 60 * 1000; // 1 minute
const VELOCITY_THRESHOLD = 30; // max requests per minute per IP on auth routes

// Purge stale velocity entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of requestVelocity.entries()) {
    if (now - data.windowStart > VELOCITY_WINDOW_MS * 2) {
      requestVelocity.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// ─── Middleware: Detect AI Agents & Bots ─────────────────────────────────────
const detectAIAgent = (req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.connection.remoteAddress;

  const isBot = AI_AGENT_PATTERNS.some(pattern => pattern.test(userAgent));

  if (isBot) {
    logger.securityEvent('SUSPICIOUS_AGENT', {
      ip,
      userAgent,
      path: req.path,
      method: req.method,
    });
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Automated agent access is not permitted.',
    });
  }

  // Flag missing User-Agent (common in raw API abuse / AI agents)
  if (!userAgent || userAgent.trim() === '') {
    logger.securityEvent('MISSING_USER_AGENT', {
      ip,
      path: req.path,
      method: req.method,
    });
    return res.status(400).json({
      error: 'Bad Request',
      message: 'User-Agent header is required.',
    });
  }

  next();
};

// ─── Middleware: Request Velocity / Behavioral Anomaly Detection ──────────────
const detectVelocityAbuse = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  if (!requestVelocity.has(ip)) {
    requestVelocity.set(ip, { count: 1, windowStart: now });
    return next();
  }

  const data = requestVelocity.get(ip);

  // Reset window if expired
  if (now - data.windowStart > VELOCITY_WINDOW_MS) {
    requestVelocity.set(ip, { count: 1, windowStart: now });
    return next();
  }

  data.count += 1;

  if (data.count > VELOCITY_THRESHOLD) {
    logger.securityEvent('VELOCITY_ABUSE', {
      ip,
      requestCount: data.count,
      windowMs: VELOCITY_WINDOW_MS,
      path: req.path,
    });
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Abnormal request velocity detected. Access temporarily blocked.',
      retryAfter: Math.ceil((VELOCITY_WINDOW_MS - (now - data.windowStart)) / 1000),
    });
  }

  next();
};

// ─── Middleware: Token Replay Prevention ─────────────────────────────────────
// Extracts the JWT `jti` (JWT ID) claim and checks it hasn't been used before.
// Requires tokens to include a `jti` claim (standard for Entra ID tokens).
const preventTokenReplay = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Let authenticate() handle missing token
  }

  try {
    const token = authHeader.split(' ')[1];

    // Decode payload without verification (verification happens in authMiddleware)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Malformed token structure.' });
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    const jti = payload.jti;
    const exp = payload.exp ? payload.exp * 1000 : null;
    const ip = req.ip || req.connection.remoteAddress;

    if (jti) {
      if (usedTokenNonces.has(jti)) {
        logger.securityEvent('TOKEN_REPLAY', {
          ip,
          jti,
          path: req.path,
          sub: payload.sub || 'unknown',
        });
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Token replay detected. Please re-authenticate.',
        });
      }

      // Register this token's jti
      const ttl = exp ? Math.min(exp - Date.now(), NONCE_TTL_MS) : NONCE_TTL_MS;
      if (ttl > 0) {
        usedTokenNonces.set(jti, Date.now() + ttl);
      }
    }

    // Attach decoded claims for downstream use
    req.tokenClaims = payload;
    next();
  } catch (err) {
    logger.securityEvent('TOKEN_PARSE_ERROR', {
      ip: req.ip,
      error: err.message,
      path: req.path,
    });
    return res.status(401).json({ error: 'Unauthorized', message: 'Token processing failed.' });
  }
};

// ─── Middleware: Security Headers for AI/Bot Hardening ───────────────────────
const addSecurityHeaders = (req, res, next) => {
  // Prevent AI crawlers and indexing bots from accessing the API
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Restrict permissions
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  // Cache control — never cache auth responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  next();
};

module.exports = {
  detectAIAgent,
  detectVelocityAbuse,
  preventTokenReplay,
  addSecurityHeaders,
};
