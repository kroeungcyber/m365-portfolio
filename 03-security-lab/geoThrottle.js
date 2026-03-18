/**
 * geoThrottle.js
 * Geo-Aware Rate Limiting & Regional Threat Throttling
 *
 * Context: Cambodia SME Threat Landscape (2026)
 *
 * Cambodia SMEs face targeted AI-powered attacks from:
 *  - Automated credential stuffing campaigns (regional botnets)
 *  - AI agent enumeration from cloud provider IP ranges
 *  - Telegram/Facebook-based phishing bots targeting Cambodian businesses
 *  - Cross-border financial fraud automation (targeting NBC-regulated entities)
 *
 * This middleware applies tiered rate limiting based on:
 *  1. Known cloud/AI provider IP ranges (where AI agents are hosted)
 *  2. Request pattern analysis (not true geo-IP, which requires a paid DB)
 *  3. Configurable block/throttle lists for Cambodia SME deployments
 *
 * NOTE: For production geo-IP, integrate MaxMind GeoLite2 or ip-api.com.
 * This module provides the framework + Cambodia-specific configuration.
 */

const logger = require('./logger');

// ─── Known AI/Cloud Provider IP Prefixes ─────────────────────────────────────
// These ranges host the majority of AI agent infrastructure.
// AI agents running on these ranges get tighter rate limits.
// Source: Public ASN data for major cloud providers.
const CLOUD_AI_PREFIXES = [
  // AWS (common AI agent hosting)
  '3.', '13.', '18.', '34.', '35.', '52.', '54.',
  // Google Cloud (Gemini agents, Vertex AI)
  '34.', '35.', '104.196.', '104.197.',
  // Azure (OpenAI Service, Copilot agents)
  '20.', '40.', '51.', '52.', '104.40.',
  // Cloudflare Workers (AI agent deployment)
  '104.16.', '104.17.', '104.18.', '104.19.',
  // DigitalOcean (cheap AI agent hosting)
  '104.131.', '104.236.', '138.197.', '159.65.',
  // Linode/Akamai
  '45.33.', '45.56.', '45.79.',
  // Vultr
  '45.32.', '45.63.', '45.76.',
  // OVH (popular in Southeast Asia for cheap hosting)
  '51.68.', '51.75.', '51.77.', '51.89.',
];

// ─── Rate Limit Tiers ─────────────────────────────────────────────────────────
// Tier 1: Standard (trusted/unknown origin)
// Tier 2: Cloud/AI provider IP (tighter limits)
// Tier 3: Flagged IP (already triggered security events)

const RATE_LIMITS = {
  standard: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    label: 'STANDARD',
  },
  cloudAI: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 20,
    label: 'CLOUD_AI_PROVIDER',
  },
  flagged: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    label: 'FLAGGED_IP',
  },
};

// ─── Per-IP Geo-Throttle Tracker ──────────────────────────────────────────────
const geoThrottleTracker = new Map(); // ip -> { tier, count, windowStart, flaggedAt }
const flaggedIPs = new Set(); // IPs that have triggered security events

// Purge stale entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of geoThrottleTracker.entries()) {
    const limit = RATE_LIMITS[data.tier] || RATE_LIMITS.standard;
    if (now - data.windowStart > limit.windowMs * 2) {
      geoThrottleTracker.delete(ip);
    }
  }
}, 30 * 60 * 1000);

// ─── Helper: Determine IP Tier ────────────────────────────────────────────────
const getIPTier = (ip) => {
  if (!ip) return 'standard';

  // Check if previously flagged
  if (flaggedIPs.has(ip)) return 'flagged';

  // Check if from known cloud/AI provider range
  const isCloudAI = CLOUD_AI_PREFIXES.some(prefix => ip.startsWith(prefix));
  if (isCloudAI) return 'cloudAI';

  return 'standard';
};

// ─── Export: Flag an IP (called by other security middleware) ─────────────────
const flagIP = (ip) => {
  if (ip) {
    flaggedIPs.add(ip);
    // Auto-unflag after 24 hours (prevent permanent blocks for SME false positives)
    setTimeout(() => flaggedIPs.delete(ip), 24 * 60 * 60 * 1000);
  }
};

// ─── Middleware: Geo-Aware Rate Throttle ──────────────────────────────────────
const geoThrottle = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const tier = getIPTier(ip);
  const limit = RATE_LIMITS[tier];

  if (!geoThrottleTracker.has(ip)) {
    geoThrottleTracker.set(ip, { tier, count: 1, windowStart: now });
    return next();
  }

  const data = geoThrottleTracker.get(ip);

  // Update tier if it changed (e.g., IP was flagged mid-session)
  const currentTier = getIPTier(ip);
  if (currentTier !== data.tier) {
    data.tier = currentTier;
    data.count = 1;
    data.windowStart = now;
    return next();
  }

  // Reset window if expired
  if (now - data.windowStart > limit.windowMs) {
    data.count = 1;
    data.windowStart = now;
    return next();
  }

  data.count += 1;

  if (data.count > limit.maxRequests) {
    const retryAfter = Math.ceil((limit.windowMs - (now - data.windowStart)) / 1000);

    logger.securityEvent('GEO_THROTTLE_EXCEEDED', {
      ip,
      tier: limit.label,
      requestCount: data.count,
      maxRequests: limit.maxRequests,
      windowMs: limit.windowMs,
      path: req.path,
      retryAfterSeconds: retryAfter,
    });

    // Auto-flag IPs that repeatedly exceed cloud/AI tier limits
    if (tier === 'cloudAI' && data.count > limit.maxRequests * 2) {
      flagIP(ip);
      logger.securityEvent('IP_AUTO_FLAGGED', {
        ip,
        reason: 'Repeated cloud/AI provider rate limit violations',
        path: req.path,
      });
    }

    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter,
    });
  }

  // Attach tier info for downstream logging enrichment
  req.geoTier = limit.label;
  next();
};

// ─── Cambodia SME Security Advisory ──────────────────────────────────────────
/**
 * CAMBODIA SME THREAT CONTEXT:
 *
 * Common AI-powered attack vectors targeting Cambodian SMEs (2025-2026):
 *
 * 1. TELEGRAM BOT ATTACKS
 *    - Automated bots scrape M365 login pages via Telegram-hosted agents
 *    - Mitigation: Block Telegram bot IP ranges + enforce MFA via Entra ID CA
 *
 * 2. FACEBOOK MESSENGER PHISHING AUTOMATION
 *    - AI agents send personalized phishing messages mimicking Cambodian banks
 *    - Mitigation: User awareness training + Microsoft Defender for Office 365
 *
 * 3. REGIONAL BOTNET CREDENTIAL STUFFING
 *    - Botnets operating from Vietnam, Thailand, China target .kh domains
 *    - Mitigation: This geoThrottle middleware + Entra ID Smart Lockout
 *
 * 4. CLOUD-HOSTED AI ENUMERATION
 *    - AI agents on AWS/Azure/GCP enumerate M365 APIs at scale
 *    - Mitigation: Cloud IP tier in this middleware + velocity detection
 *
 * 5. SUPPLY CHAIN AI ATTACKS
 *    - Compromised npm/pip packages with AI agent payloads
 *    - Mitigation: npm audit + dependency pinning + SBOM tracking
 *
 * PRODUCTION RECOMMENDATION:
 * For true geo-IP blocking, integrate MaxMind GeoLite2 (free) or
 * ip-api.com (free tier: 45 req/min) to identify country of origin.
 * Cambodia SMEs can then apply stricter limits to unexpected countries.
 *
 * Example integration:
 *   const response = await fetch(`http://ip-api.com/json/${ip}?fields=country,isp,proxy,hosting`);
 *   const { country, proxy, hosting } = await response.json();
 *   if (hosting || proxy) { apply cloudAI tier limits }
 */

module.exports = {
  geoThrottle,
  flagIP,
  getIPTier,
  RATE_LIMITS,
  CLOUD_AI_PREFIXES,
};
