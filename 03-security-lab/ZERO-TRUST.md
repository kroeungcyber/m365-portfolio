# Zero Trust Architecture & AI Agent Defense

## Overview

This document describes the Zero Trust security architecture implemented in the M365 Security Lab, with a specific focus on defending against the **rising threat of AI agent-based attacks**.

> **"Never Trust, Always Verify"** — Every request is treated as potentially hostile, regardless of origin, network location, or prior authentication.

---

## 🤖 The AI Agent Threat Model

### What Are AI Agent Attacks?

AI agents are autonomous software systems powered by Large Language Models (LLMs) that can:

- **Automate credential stuffing** at superhuman speed
- **Enumerate API endpoints** systematically without human fatigue
- **Replay stolen tokens** across sessions
- **Mimic legitimate user behavior** to evade simple rate limiters
- **Chain vulnerabilities** across multiple services autonomously
- **Exfiltrate data** through seemingly normal API calls

### Attack Vectors Addressed

| Attack Vector | Threat | Defense Implemented |
|:---|:---|:---|
| **Automated Enumeration** | AI agents probe all endpoints rapidly | Per-route rate limiting (20 req/5min on auth routes) + velocity detection |
| **Token Replay** | Stolen JWT reused by agent | `jti` nonce tracking — each token usable only once |
| **Bot Impersonation** | Agent mimics browser requests | User-Agent pattern matching (28+ known AI/bot signatures) |
| **Credential Stuffing** | Automated login attempts | Auth-specific rate limiter + behavioral anomaly detection |
| **Header Injection** | Malformed Authorization headers | Regex sanitization + length limits on all auth headers |
| **Forged Tokens** | AI-generated or tampered JWTs | Cryptographic JWT pre-validation via JWKS (RS256) |
| **CORS Bypass** | Cross-origin API abuse | Strict origin allowlist with violation logging |
| **Information Harvesting** | Error messages reveal internals | Sanitized error responses — no stack traces or MSAL details |

---

## 🏛️ Zero Trust Pillars Implementation

### Pillar 1: Verify Explicitly

Every request must prove identity — no implicit trust based on network location or prior session.

```
Request → Sanitize Header → JWT Pre-Validation (RS256/JWKS) → MSAL OBO Flow → RBAC Check
```

**Implementation:**
- `authMiddleware.js`: `sanitizeAuthHeader()` validates token format and length before any processing
- `authMiddleware.js`: `preValidateToken()` cryptographically verifies JWT signature, issuer, audience, and expiry using Microsoft's JWKS endpoint
- Only after cryptographic validation does the MSAL OBO flow execute

### Pillar 2: Use Least Privilege Access

Users and services receive only the minimum permissions required.

**Implementation:**
- Three-tier RBAC: `admin` → `manager` → `employee`
- Per-route permission requirements (`['*']`, `['read']`, `['read', 'write', 'approve']`)
- Group membership verified from JWT claims on every request — no session-based privilege caching
- `authorize()` middleware logs every grant and denial for audit

### Pillar 3: Assume Breach

Design as if the perimeter has already been compromised. Log everything, detect anomalies, limit blast radius.

**Implementation:**
- `logger.js`: Structured security event logging with 11 event categories
- `aiAgentDefense.js`: Real-time behavioral anomaly detection
- `aiAgentDefense.js`: Token replay prevention via in-memory nonce store
- Error responses never expose internal details in production
- Request body size limited to 10KB to prevent payload attacks

---

## 🛡️ Defense-in-Depth Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        INCOMING REQUEST                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: Network & Headers                                     │
│  • Helmet.js (CSP, HSTS, X-Content-Type-Options, etc.)         │
│  • X-Robots-Tag: noindex, nofollow (blocks AI crawlers)        │
│  • Permissions-Policy (restricts browser APIs)                  │
│  • Cache-Control: no-store (prevents response caching)          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2: AI Agent & Bot Detection                              │
│  • User-Agent pattern matching (28+ AI/bot signatures)         │
│  • Missing User-Agent rejection                                 │
│  • Request velocity tracking (30 req/min threshold)            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: Rate Limiting                                         │
│  • Global: 100 req / 15 min per IP                             │
│  • Auth routes: 20 req / 5 min per IP                          │
│  • Velocity anomaly: 30 req / 1 min per IP                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 4: CORS Enforcement                                      │
│  • Strict origin allowlist                                      │
│  • Violations logged as security events                         │
│  • No-origin requests blocked in production                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 5: Token Replay Prevention                               │
│  • JWT `jti` claim extracted and checked against nonce store   │
│  • Each token usable exactly once within its TTL               │
│  • Replay attempts logged as TOKEN_REPLAY security events      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 6: JWT Cryptographic Pre-Validation                      │
│  • RS256 signature verification via Microsoft JWKS             │
│  • Issuer validation (Entra ID tenant-specific)                │
│  • Audience validation (app-specific)                          │
│  • Expiry validation                                            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 7: MSAL OBO Flow                                         │
│  • On-Behalf-Of token exchange with Microsoft Entra ID         │
│  • Acquires scoped access token for downstream services        │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 8: RBAC Authorization                                    │
│  • Group claims extracted from validated JWT                   │
│  • Role resolution: admin / manager / employee                 │
│  • Permission check against route requirements                 │
│  • Every grant and denial logged                               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
                   ✅ AUTHORIZED RESPONSE
```

---

## 📊 Security Event Audit Trail

All security events are logged in structured JSON format for SIEM integration:

| Event Type | Trigger | Severity |
|:---|:---|:---|
| `AUTH_SUCCESS` | Successful authentication | Info |
| `AUTH_FAILURE` | Failed auth (bad token, expired, forged) | Warning |
| `RBAC_GRANT` | Permission check passed | Info |
| `RBAC_DENY` | Insufficient permissions | Warning |
| `SUSPICIOUS_AGENT` | Known AI/bot User-Agent detected | Warning |
| `MISSING_USER_AGENT` | No User-Agent header | Warning |
| `TOKEN_REPLAY` | Duplicate JWT `jti` detected | **Critical** |
| `TOKEN_PARSE_ERROR` | Malformed token structure | Warning |
| `VELOCITY_ABUSE` | Rate limit or velocity threshold exceeded | Warning |
| `CORS_VIOLATION` | Request from unauthorized origin | Warning |
| `CONFIG_ERROR` | Environment misconfiguration at startup | **Critical** |
| `UNHANDLED_ERROR` | Unexpected server exception | Error |

### Sample Security Event Log

```json
{
  "timestamp": "2026-03-17T01:00:00.000Z",
  "level": "warn",
  "service": "m365-security-lab",
  "message": "[SECURITY_EVENT] TOKEN_REPLAY",
  "eventType": "TOKEN_REPLAY",
  "ip": "203.0.113.42",
  "jti": "a1b2c3d4-...",
  "path": "/api/admin/settings",
  "sub": "user-object-id"
}
```

---

## 🔧 Configuration Reference

### Environment Variables (Security-Critical)

| Variable | Purpose | Zero Trust Role |
|:---|:---|:---|
| `CLIENT_ID` | Entra ID App Registration ID | Token audience validation |
| `CLIENT_SECRET` | App secret for OBO flow | Service authentication |
| `TENANT_ID` | Entra ID tenant | Token issuer validation |
| `ALLOWED_ORIGINS` | CORS allowlist | Origin enforcement |
| `NODE_ENV` | Runtime environment | Error detail control |
| `ADMIN_GROUP_ID` | Admin RBAC group | Least privilege |
| `MANAGER_GROUP_ID` | Manager RBAC group | Least privilege |
| `EMPLOYEE_GROUP_ID` | Employee RBAC group | Least privilege |

---

## 🚀 Production Hardening Checklist

- [x] JWT cryptographic validation (RS256 + JWKS)
- [x] Token replay prevention (jti nonce store)
- [x] AI agent / bot detection (28+ patterns)
- [x] Behavioral velocity anomaly detection
- [x] Tiered rate limiting (global + per-route)
- [x] Strict CORS with violation logging
- [x] Hardened CSP (default-src: none)
- [x] HSTS with preload (1 year)
- [x] Sanitized error responses
- [x] Structured security audit logging
- [x] Request body size limits
- [x] Environment variable validation at startup
- [ ] Replace in-memory nonce store with Redis (production)
- [ ] Add Microsoft Sentinel integration for SIEM
- [ ] Implement Privileged Identity Management (PIM)
- [ ] Add Continuous Access Evaluation (CAE) support
- [ ] Deploy behind Azure API Management with additional WAF rules

---

## 📚 References

- [Microsoft Zero Trust Guidance](https://learn.microsoft.com/en-us/security/zero-trust/)
- [NIST SP 800-207: Zero Trust Architecture](https://csrc.nist.gov/publications/detail/sp/800-207/final)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Microsoft Entra ID Token Validation](https://learn.microsoft.com/en-us/azure/active-directory/develop/access-tokens)
- [CIS Microsoft 365 Foundations Benchmark v3.0](https://www.cisecurity.org/benchmark/microsoft_365)
