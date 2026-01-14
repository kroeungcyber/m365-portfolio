require('dotenv').config();
const msal = require('@azure/msal-node');

// Initialize MSAL client
const msalConfig = {
  auth: {
    clientId: process.env.CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
    knownAuthorities: [`https://login.microsoftonline.com/${process.env.TENANT_ID}`],
    redirectUri: process.env.REDIRECT_URI
  }
};
const cca = new msal.ConfidentialClientApplication(msalConfig);

// RBAC Roles and Scopes
const authConfig = {
  scopes: ["user.read", `api://${process.env.CLIENT_ID}/access_as_user`],
  roles: {
    admin: {
      groups: [process.env.ADMIN_GROUP_ID],
      permissions: ["*"]
    },
    manager: {
      groups: [process.env.MANAGER_GROUP_ID],
      permissions: ["read", "write", "approve"]
    },
    employee: {
      groups: [process.env.EMPLOYEE_GROUP_ID],
      permissions: ["read", "submit"]
    }
  }
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Bearer token missing' });
    }

    const token = authHeader.split(' ')[1];
    const result = await cca.acquireTokenOnBehalfOf({
      oboAssertion: token,
      scopes: authConfig.scopes
    });

    req.auth = {
      token: result.accessToken,
      account: result.account
    };
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    res.status(401).json({ error: 'Authentication failed', details: error.message });
  }
};

// Authorization middleware
const authorize = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      if (!req.auth || !req.auth.account) {
        return res.status(401).json({ error: 'Unauthorized', message: 'No authentication context found' });
      }

      const groups = req.auth.account.idTokenClaims.groups || [];
      const userRoles = Object.entries(authConfig.roles)
        .filter(([_, role]) => groups.some(g => role.groups.includes(g)))
        .map(([name]) => name);

      const hasPermission = userRoles.some(role => 
        authConfig.roles[role].permissions.some(p => 
          requiredPermissions.includes(p) || p === '*'
        )
      );

      if (!hasPermission) {
        return res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions' });
      }
      next();
    } catch (error) {
      console.error('Authorization error:', error.message);
      res.status(403).json({ error: 'Authorization failed', details: error.message });
    }
  };
};

module.exports = { authenticate, authorize };
