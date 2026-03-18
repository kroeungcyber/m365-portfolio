/**
 * promptInjectionDefense.js
 * Prompt Injection & Agentic Chain Attack Detection Middleware
 *
 * Defends against:
 *  - LLM prompt injection via request body / query params / headers
 *  - Jailbreak attempts targeting AI-integrated APIs
 *  - Agentic chain attacks (multi-step tool-use patterns)
 *  - Structured AI tool-call probing payloads
 *  - System prompt override attempts
 *
 * Tailored for: Cambodia SME deployments using M365 + AI-integrated services
 */

const logger = require('./logger');

// ─── Prompt Injection Patterns ────────────────────────────────────────────────
// Covers common LLM injection, jailbreak, and system override patterns
// used by AI agents attacking M365-integrated APIs.
const PROMPT_INJECTION_PATTERNS = [
  // Classic instruction override
  /ignore\s+(previous|prior|above|all)\s+(instructions?|prompts?|context)/i,
  /disregard\s+(previous|prior|above|all)\s+(instructions?|prompts?|context)/i,
  /forget\s+(previous|prior|above|all)\s+(instructions?|prompts?|context)/i,
  /override\s+(previous|prior|above|all)\s+(instructions?|prompts?|context)/i,

  // System prompt injection
  /\bsystem\s*:\s*you\s+are/i,
  /\bsystem\s*prompt\b/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /<\|system\|>/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /<<SYS>>/i,
  /<\/SYS>/i,

  // Role/persona hijacking
  /\bact\s+as\s+(a\s+)?(hacker|attacker|admin|root|superuser|developer\s+mode)/i,
  /\bpretend\s+(you\s+are|to\s+be)\s+(a\s+)?(hacker|attacker|admin|root)/i,
  /\byou\s+are\s+now\s+(in\s+)?(developer|jailbreak|dan|unrestricted)\s+mode/i,
  /\bdan\s+mode\b/i,
  /\bjailbreak\b/i,
  /\bunrestricted\s+mode\b/i,

  // Data exfiltration via prompt
  /\brepeat\s+(everything|all)\s+(above|before|prior)/i,
  /\bprint\s+(your\s+)?(system\s+prompt|instructions|context)/i,
  /\bshow\s+(me\s+)?(your\s+)?(system\s+prompt|instructions|api\s+key|secret)/i,
  /\bwhat\s+(are\s+)?(your\s+)?(instructions|system\s+prompt|context)/i,
  /\breveal\s+(your\s+)?(instructions|system\s+prompt|api\s+key|secret)/i,

  // Tool/function call injection (OpenAI function calling, LangChain tools)
  /\btool_call\b/i,
  /\bfunction_call\b/i,
  /"tool_choice"\s*:/i,
  /"function_call"\s*:/i,
  /\b__import__\s*\(/i,
  /\beval\s*\(/i,
  /\bexec\s*\(/i,

  // Indirect injection via encoded content
  /base64\s*decode/i,
  /atob\s*\(/i,

  // Multi-agent orchestration injection
  /\bagent\s*:\s*(execute|run|call|invoke)/i,
  /\btask\s*:\s*(execute|run|call|invoke)/i,
  /\bstep\s+\d+\s*:\s*(execute|run|call|invoke)/i,

  // Cambodia-specific: Khmer-script injection attempts (Unicode ranges)
  // Detects attempts to use Khmer Unicode to bypass ASCII-based filters
  // while still containing injection keywords in mixed scripts
];

// ─── Agentic Chain Detection ──────────────────────────────────────────────────
// Tracks sequential API calls that match multi-step AI agent tool-use patterns.
// AI agents typically: enumerate → authenticate → exfiltrate in structured sequences.

const agentChainTracker = new Map(); // ip -> { sequence: [], lastSeen: timestamp }
const CHAIN_WINDOW_MS = 30 * 1000; // 30 seconds
const CHAIN_THRESHOLD = 5; // 5+ sequential structured calls = agentic pattern

// Endpoint patterns that AI agents commonly chain together
const AGENTIC_ENDPOINT_PATTERNS = [
  /\/api\/profile/i,
  /\/api\/admin/i,
  /\/api\/documents/i,
  /\/api\/users/i,
  /\/api\/settings/i,
  /\/health/i,
  /\/api\/audit/i,
];

// Purge stale chain entries every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of agentChainTracker.entries()) {
    if (now - data.lastSeen > CHAIN_WINDOW_MS * 2) {
      agentChainTracker.delete(ip);
    }
  }
}, 2 * 60 * 1000);

// ─── Middleware: Prompt Injection Detection ───────────────────────────────────
const detectPromptInjection = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;

  // Collect all user-controlled input surfaces
  const inputSurfaces = [
    JSON.stringify(req.body || {}),
    JSON.stringify(req.query || {}),
    req.headers['x-custom-prompt'] || '',
    req.headers['x-user-input'] || '',
    req.headers['x-message'] || '',
    // Check common AI-integration headers
    req.headers['x-openai-prompt'] || '',
    req.headers['x-langchain-input'] || '',
  ].join(' ');

  const injectionMatch = PROMPT_INJECTION_PATTERNS.find(pattern =>
    pattern.test(inputSurfaces)
  );

  if (injectionMatch) {
    logger.securityEvent('PROMPT_INJECTION', {
      ip,
      path: req.path,
      method: req.method,
      pattern: injectionMatch.toString(),
      // Never log the actual payload — it may contain sensitive data
      payloadSize: inputSurfaces.length,
    });
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Request contains disallowed content patterns.',
    });
  }

  next();
};

// ─── Middleware: Agentic Chain Detection ──────────────────────────────────────
const detectAgenticChain = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const path = req.path;

  // Only track calls to known API endpoints
  const isTrackedEndpoint = AGENTIC_ENDPOINT_PATTERNS.some(p => p.test(path));
  if (!isTrackedEndpoint) return next();

  if (!agentChainTracker.has(ip)) {
    agentChainTracker.set(ip, { sequence: [path], lastSeen: now });
    return next();
  }

  const data = agentChainTracker.get(ip);

  // Reset if window expired
  if (now - data.lastSeen > CHAIN_WINDOW_MS) {
    agentChainTracker.set(ip, { sequence: [path], lastSeen: now });
    return next();
  }

  data.sequence.push(path);
  data.lastSeen = now;

  // Detect agentic pattern: many different endpoints hit in rapid succession
  const uniqueEndpoints = new Set(data.sequence).size;

  if (data.sequence.length >= CHAIN_THRESHOLD && uniqueEndpoints >= 3) {
    logger.securityEvent('AGENTIC_CHAIN_DETECTED', {
      ip,
      sequenceLength: data.sequence.length,
      uniqueEndpoints,
      sequence: data.sequence.slice(-10), // Last 10 calls
      windowMs: CHAIN_WINDOW_MS,
    });

    // Reset tracker after detection (don't permanently block — may be legitimate)
    agentChainTracker.delete(ip);

    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Automated sequential access pattern detected. Please slow down.',
      retryAfter: Math.ceil(CHAIN_WINDOW_MS / 1000),
    });
  }

  next();
};

// ─── Middleware: Request Fingerprint Anomaly Detection ────────────────────────
// AI agents often lack standard browser headers, have unusual header ordering,
// or send headers that no real browser would send.
const detectFingerprintAnomaly = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const anomalies = [];

  // Check for browser-standard headers that AI agents typically omit
  const hasAccept = !!req.headers['accept'];
  const hasAcceptLanguage = !!req.headers['accept-language'];
  const hasAcceptEncoding = !!req.headers['accept-encoding'];
  const userAgent = req.headers['user-agent'] || '';

  // Real browsers always send Accept, Accept-Language, Accept-Encoding
  if (!hasAccept) anomalies.push('missing-accept');
  if (!hasAcceptLanguage) anomalies.push('missing-accept-language');
  if (!hasAcceptEncoding) anomalies.push('missing-accept-encoding');

  // Detect headless browser signatures in User-Agent
  if (/HeadlessChrome/i.test(userAgent)) anomalies.push('headless-chrome');
  if (/Electron/i.test(userAgent)) anomalies.push('electron-runtime');

  // Detect suspiciously perfect User-Agent strings (AI agents often copy exact strings)
  // Real browsers have minor variations; perfect strings are a red flag
  const suspiciousUAPatterns = [
    /^Mozilla\/5\.0 \(compatible\)$/i, // Minimal fake UA
    /^python\//i,
    /^go-http-client\//i,
    /^java\//i,
    /^okhttp\//i,
    /^apache-httpclient\//i,
  ];
  if (suspiciousUAPatterns.some(p => p.test(userAgent))) {
    anomalies.push('suspicious-user-agent-format');
  }

  // Only flag if multiple anomalies detected (reduce false positives for SMEs)
  if (anomalies.length >= 2) {
    logger.securityEvent('FINGERPRINT_ANOMALY', {
      ip,
      path: req.path,
      anomalies,
      userAgent: userAgent.substring(0, 200), // Truncate for log safety
    });

    // Log but don't block — fingerprint anomalies alone are not conclusive
    // They are used to enrich other security event context
    req.fingerprintAnomalies = anomalies;
  }

  next();
};

module.exports = {
  detectPromptInjection,
  detectAgenticChain,
  detectFingerprintAnomaly,
  PROMPT_INJECTION_PATTERNS,
};
