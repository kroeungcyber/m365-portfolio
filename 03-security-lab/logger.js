const winston = require('winston');

// ─── Custom Security Event Log Format ────────────────────────────────────────
const securityEventFormat = winston.format.printf(({ level, message, timestamp, service, ...meta }) => {
  return JSON.stringify({ timestamp, level, service, message, ...meta });
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'm365-security-lab' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// ─── Security Event Categories ────────────────────────────────────────────────
// Structured security event logger for SIEM/audit trail integration.
// Categories align with Zero Trust audit requirements.
const SECURITY_EVENT_TYPES = {
  AUTH_FAILURE:      'AUTH_FAILURE',       // Authentication failed (bad/expired token)
  AUTH_SUCCESS:      'AUTH_SUCCESS',       // Successful authentication
  RBAC_DENY:         'RBAC_DENY',          // Authorization denied (insufficient permissions)
  RBAC_GRANT:        'RBAC_GRANT',         // Authorization granted
  SUSPICIOUS_AGENT:  'SUSPICIOUS_AGENT',   // Known AI agent / bot User-Agent detected
  MISSING_USER_AGENT:'MISSING_USER_AGENT', // Request with no User-Agent header
  TOKEN_REPLAY:      'TOKEN_REPLAY',       // Duplicate JWT jti detected (replay attack)
  TOKEN_PARSE_ERROR: 'TOKEN_PARSE_ERROR',  // Malformed or unparseable token
  VELOCITY_ABUSE:    'VELOCITY_ABUSE',     // Abnormal request velocity (enumeration/brute force)
  CONFIG_ERROR:      'CONFIG_ERROR',       // Environment/configuration validation failure
  UNHANDLED_ERROR:   'UNHANDLED_ERROR',    // Unexpected server error
};

/**
 * Log a structured security event.
 * @param {string} eventType - One of SECURITY_EVENT_TYPES
 * @param {object} meta - Additional context (ip, path, user, etc.)
 */
logger.securityEvent = (eventType, meta = {}) => {
  logger.warn({
    message: `[SECURITY_EVENT] ${eventType}`,
    eventType,
    ...meta,
  });
};

logger.SECURITY_EVENT_TYPES = SECURITY_EVENT_TYPES;

module.exports = logger;
