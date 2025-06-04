const msal = require('@azure/msal-node');
const config = require('./auth-config.json');

// Initialize MSAL client
const msalConfig = {
  auth: {
    clientId: config.auth.clientId,
    authority: config.auth.authority,
    knownAuthorities: [config.auth.authority],
    redirectUri: config.auth.redirectUri
  }
};
const cca = new msal.ConfidentialClientApplication(msalConfig);

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).send('Authorization header missing');
    }

    const token = authHeader.split(' ')[1];
    const result = await cca.acquireTokenOnBehalfOf({
      oboAssertion: token,
      scopes: config.auth.scopes
    });

    req.auth = {
      token: result.accessToken,
      account: result.account
    };
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).send('Authentication failed');
  }
};

// Authorization middleware
const authorize = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      const groups = req.auth.account.idTokenClaims.groups || [];
      const userRoles = Object.entries(config.rbac.roles)
        .filter(([_, role]) => groups.some(g => role.groups.includes(g)))
        .map(([name]) => name);

      const hasPermission = userRoles.some(role => 
        config.rbac.roles[role].permissions.some(p => 
          requiredPermissions.includes(p) || p === '*'
        )
      );

      if (!hasPermission) {
        return res.status(403).send('Insufficient permissions');
      }
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(403).send('Authorization failed');
    }
  };
};

module.exports = { authenticate, authorize };