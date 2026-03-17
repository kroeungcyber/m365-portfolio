/**
 * authMiddleware.js
 * Zero Trust Authentication & Authorization Middleware
 *
 * Security hardening:
 *  - JWT pre-validation (issuer, audience, expiry, structure) before MSAL OBO call
 *  - Input sanitization on Authorization header
 *  - Full audit logging of all auth/RBAC events
 *  - Sanitized error responses (no internal details leaked)
 *  - Group-based RBAC with least-privilege enforcement
 */

require('dotenv').config();
const msal = require('@azure/msal-node');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const logger = require('./logger');

// ─── MSAL Client Configuration ───────────────────────────────────────────────
const msalConfig = {
  auth: {
    clientId: process.env.CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
    knownAuthorities: [`https://login.microsoftonline.com/${process.env.TENANT_ID}`],
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI,
  },
};
const cca = new msal.ConfidentialClientApplication(msalConfig);

// ─── JWKS Client for Token Signature Verification ────────────────────────────
// Fetches Microsoft's public signing keys to cryptographically verify tokens.
const jwks = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 10 * 60 * 1000, // 10 minutes
  rateLimit: true,
});

const getSigningKey = (header, callback) => {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
};

// ─── RBAC Configuration ───────────────────────────────────────────────────────
const authConfig = {
  scopes: ['user.read', `api://${process.env.CLIENT_ID}/access_as_user`],
  roles: {
    admin: {
      groups: [process.env.ADMIN_GROUP_ID],
      permissions: ['*'],
    },
    manager: {
      groups: [process.env.MANAGER_GROUP_ID],
      permissions: ['read', 'write', 'approve'],
    },
    employee: {
      groups: [process.env.EMPLOYEE_GROUP_ID],
      permissions: ['read', 'submit'],
    },
  },
};

// ─── Token Input Sanitization ─────────────────────────────────────────────────
const MAX_TOKEN_LENGTH = 8192; // Entra ID tokens are typically < 4KB; 8KB is a safe upper bound
const BEARER_REGEX = /^Bearer [A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_.+/=]*$/;

const sanitizeAuthHeader = (authHeader) => {
  if (!authHeader) return null;
  if (authHeader.length > MAX_TOKEN_LENGTH) return null;
  if (!BEARER_REGEX.test(authHeader)) return null;
  return authHeader;
};

// ─── JWT Pre-Validation ───────────────────────────────────────────────────────
// Validates token structure, signature, issuer, audience, and expiry
// BEFORE making any MSAL OBO call — prevents wasted calls with forged tokens.
const preValidateToken = (token) => {
  return new Promise((resolve, reject) => {
    const validationOptions = {
      algorithms: ['RS256'],
      issuer: [
        `https://login.microsoftonline.com/${process.env.TENANT_ID}/v2.0`,
        `https://sts.windows.net/${process.env.TENANT_ID}/`,
      ],
      audience: [
        process.env.CLIENT_ID,
        `api://${process.env.CLIENT_ID}`,
      ],
    };

    jwt.verify(token, getSigningKey, validationOptions, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
};

// ─── Authentication Middleware ────────────────────────────────────────────────
const authenticate = async (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const rawAuthHeader = req.headers.authorization;

  // 1. Sanitize Authorization header
  const authHeader = sanitizeAuthHeader(rawAuthHeader);
  if (!authHeader) {
    logger.securityEvent('AUTH_FAILURE', {
      ip,
      path: req.path,
      reason: 'Missing, malformed, or oversized Authorization header',
    });
    return res.status(401).json({ error: 'Unauthorized', message: 'Valid Bearer token required.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 2. Pre-validate JWT (signature, issuer, audience, expiry)
    let decodedClaims;
    try {
      decodedClaims = await preValidateToken(token);
    } catch (jwtErr) {
      logger.securityEvent('AUTH_FAILURE', {
        ip,
        path: req.path,
        reason: 'JWT pre-validation failed',
        jwtError: jwtErr.name, // Only log error type, not full message
      });
      return res.status(401).json({ error: 'Unauthorized', message: 'Token validation failed.' });
    }

    // 3. Perform MSAL OBO flow with pre-validated token
    const result = await cca.acquireTokenOnBehalfOf({
      oboAssertion: token,
      scopes: authConfig.scopes,
    });

    req.auth = {
      token: result.accessToken,
      account: result.account,
      claims: decodedClaims,
    };

    logger.securityEvent('AUTH_SUCCESS', {
      ip,
      path: req.path,
      sub: decodedClaims.sub || 'unknown',
      upn: decodedClaims.upn || decodedClaims.preferred_username || 'unknown',
    });

    next();
  } catch (error) {
    logger.securityEvent('AUTH_FAILURE', {
      ip,
      path: req.path,
      reason: 'MSAL OBO flow failed',
      errorCode: error.errorCode || 'unknown',
    });
    // Never expose internal error details to the client
    return res.status(401).json({ error: 'Unauthorized', message: 'Authentication failed.' });
  }
};

// ─── Authorization Middleware ─────────────────────────────────────────────────
const authorize = (requiredPermissions) => {
  return async (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;

    try {
      if (!req.auth || !req.auth.account) {
        logger.securityEvent('RBAC_DENY', {
          ip,
          path: req.path,
          reason: 'No authentication context',
        });
        return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
      }

      // Extract group claims from token (Entra ID includes groups in idTokenClaims)
      const claims = req.auth.claims || {};
      const groups = claims.groups || req.auth.account?.idTokenClaims?.groups || [];

      // Resolve user roles from group membership
      const userRoles = Object.entries(authConfig.roles)
        .filter(([_, role]) => groups.some((g) => role.groups.includes(g)))
        .map(([name]) => name);

      // Check if any resolved role has the required permission
      const hasPermission = userRoles.some((role) =>
        authConfig.roles[role].permissions.some(
          (p) => requiredPermissions.includes(p) || p === '*'
        )
      );

      if (!hasPermission) {
        logger.securityEvent('RBAC_DENY', {
          ip,
          path: req.path,
          sub: claims.sub || 'unknown',
          upn: claims.upn || claims.preferred_username || 'unknown',
          userRoles,
          requiredPermissions,
        });
        return res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions.' });
      }

      logger.securityEvent('RBAC_GRANT', {
        ip,
        path: req.path,
        sub: claims.sub || 'unknown',
        userRoles,
        requiredPermissions,
      });

      next();
    } catch (error) {
      logger.securityEvent('RBAC_DENY', {
        ip,
        path: req.path,
        reason: 'Authorization check threw an exception',
        errorCode: error.errorCode || 'unknown',
      });
      return res.status(403).json({ error: 'Forbidden', message: 'Authorization check failed.' });
    }
  };
};

module.exports = { authenticate, authorize };
