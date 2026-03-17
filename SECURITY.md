# SECURITY.md

## Security Policy

This project is a portfolio showcase. While the configurations and code examples follow best practices for Microsoft 365 and Azure AD (Entra ID) security, it is not intended for direct production use without thorough review and customization.

### Reporting a Vulnerability

If you discover a security vulnerability within this portfolio, please do not open a public issue. Instead, contact the maintainer directly via the contact information provided in the [README.md](./README.md).

---

## 🤖 AI Agent Threat Model & Defenses

### The Rising Threat of AI Agents

AI-powered autonomous agents represent a new class of attacker that can:

- **Operate at machine speed** — credential stuffing, endpoint enumeration, and token replay at rates no human attacker can match
- **Adapt in real-time** — LLM-driven agents can analyze API responses and adjust attack strategies autonomously
- **Evade simple defenses** — agents can rotate User-Agents, vary request timing, and chain vulnerabilities across services
- **Persist silently** — automated agents can maintain low-and-slow attack patterns that evade threshold-based detection

### Defenses Implemented

| Threat | Defense | Implementation |
|:---|:---|:---|
| Automated enumeration | Per-route rate limiting + velocity detection | `app.js` + `aiAgentDefense.js` |
| Token replay attacks | JWT `jti` nonce tracking | `aiAgentDefense.js` |
| Bot/agent impersonation | User-Agent pattern matching (28+ signatures) | `aiAgentDefense.js` |
| Forged/tampered tokens | RS256 cryptographic JWT validation via JWKS | `authMiddleware.js` |
| Header injection | Regex sanitization + length limits | `authMiddleware.js` |
| Information harvesting | Sanitized error responses (no internals leaked) | `app.js` + `authMiddleware.js` |
| AI crawler indexing | `X-Robots-Tag: noindex, nofollow` | `aiAgentDefense.js` |

> 📄 See the full AI Agent defense architecture: [03-security-lab/ZERO-TRUST.md](./03-security-lab/ZERO-TRUST.md)

---

## Security Best Practices Implemented

### 🆔 Identity & Access Management (IAM)
- **Microsoft Entra ID Implementation**: Centralized identity management using modern protocols (OpenID Connect/OAuth 2.0).
- **Conditional Access (CA)**: Zero Trust principles applied via CA policies (MFA enforcement, device compliance, and location-based access).
- **Least Privilege (RBAC)**: Fine-grained access control mapping Entra ID groups to functional roles (Admin, Manager, Employee).
- **Secure Authentication Flow**: Implementation of the MSAL OBO (On-Behalf-Of) flow to securely propagate user identity across services.
- **JWT Pre-Validation**: Cryptographic verification of token signature (RS256), issuer, audience, and expiry via Microsoft's JWKS endpoint — before any MSAL call.
- **Token Replay Prevention**: JWT `jti` (JWT ID) nonce tracking prevents stolen tokens from being reused by AI agents or attackers.

### 🛡️ Information Protection & DLP
- **Sensitivity Labeling**: Automated and manual labeling for data classification (e.g., "Highly Confidential" with encryption and watermarking).
- **Data Loss Prevention (DLP)**: Policies configured to detect and prevent accidental sharing of PII, PHI, or PCI data across Teams, SharePoint, and Exchange.
- **Safe Attachments/Links**: Integration with Microsoft Defender for Office 365 to provide time-of-click protection against malicious content.

### ⚙️ Secure Configuration & DevOps
- **Credential Safety**: Strict adherence to "No Secrets in Code" using environment variables (`.env`) and template-based configurations.
- **Audit Logging**: Comprehensive structured logging of all security events (AUTH_FAILURE, RBAC_DENY, TOKEN_REPLAY, SUSPICIOUS_AGENT, etc.) for SIEM integration.
- **Dependency Management**: Regular auditing of third-party libraries to mitigate supply chain risks (`npm audit`).
- **CORS Management**: Strict origin allowlist with violation logging — no-origin requests blocked in production.
- **Request Hardening**: Body size limits (10KB), header sanitization, and input validation on all endpoints.

### 🔒 Zero Trust Network Controls
- **Hardened CSP**: `Content-Security-Policy: default-src 'none'` — the most restrictive possible policy for an API server.
- **HSTS with Preload**: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` — forces HTTPS for 1 year.
- **Anti-Caching**: `Cache-Control: no-store` on all auth responses — prevents token caching by intermediaries.
- **Permissions Policy**: Restricts access to browser APIs (geolocation, microphone, camera).
- **Tiered Rate Limiting**: Global (100 req/15min) + auth-route-specific (20 req/5min) + behavioral velocity (30 req/1min).

---

## 📊 M365 Security Benchmark Alignment

| Benchmark | Implementation Detail |
| :--- | :--- |
| **CIS M365 v3.0** | MFA enforcement, Conditional Access, strict RBAC, and hardened API security. |
| **NIST 800-53** | Identity proofing, access control, continuous monitoring, and audit logging. |
| **NIST 800-207** | Zero Trust Architecture — verify explicitly, least privilege, assume breach. |
| **GDPR** | Data Loss Prevention (DLP) and automated retention policies. |
| **Zero Trust** | "Never Trust, Always Verify" applied to every API request with 8-layer defense-in-depth. |
| **OWASP API Top 10** | Broken auth (API1), excessive data exposure (API3), rate limiting (API4), security misconfiguration (API7). |

---

## 🗂️ Security Module Reference

| File | Purpose |
|:---|:---|
| `03-security-lab/app.js` | Hardened Express server with tiered rate limiting, strict CORS, and Helmet CSP |
| `03-security-lab/authMiddleware.js` | JWT pre-validation, MSAL OBO flow, RBAC enforcement, audit logging |
| `03-security-lab/aiAgentDefense.js` | AI agent detection, token replay prevention, velocity anomaly detection |
| `03-security-lab/logger.js` | Structured security event logging (12 event categories) |
| `03-security-lab/ZERO-TRUST.md` | Full Zero Trust architecture and AI agent threat model documentation |

---

### Disclaimer

This repository is for educational and demonstration purposes. The author is not responsible for any security incidents resulting from the use or adaptation of this code in other environments.
