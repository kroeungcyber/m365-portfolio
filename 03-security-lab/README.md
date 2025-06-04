# Security & Compliance Lab

## 📝 Project Summary

This project demonstrates Microsoft 365 security and compliance configurations that mirror enterprise regulatory requirements, showcasing expertise in protecting data and meeting compliance standards.

## 🔐 Role-Based Access Control (RBAC) Implementation

### Authentication & Authorization
- **Azure AD Authentication** using MSAL.js
- **RBAC Middleware** for route protection
- **Group-based permissions** mapped to roles

### Configuration
1. Create an Azure AD application
2. Configure auth-config.json with:
   - Client ID
   - Tenant ID
   - Redirect URI
   - Azure AD group IDs for roles
3. Install dependencies:
   ```bash
   npm install @azure/msal-node
   ```

### Usage
```javascript
const { authenticate, authorize } = require('./authMiddleware');

// Protect route with authentication
router.get('/secure', authenticate, (req, res) => {...});

// Protect route with specific permissions
router.post('/admin', authenticate, authorize(['admin']), (req, res) => {...});
```

## 🧩 Features Implemented

* **Data Loss Prevention (DLP)** policies for OneDrive and SharePoint
* **Sensitivity Labels** ("Confidential", "Internal Use") with encryption
* **Retention Policies** and audit logging for compliance
* **Conditional Access** rules with MFA enforcement
* **Threat Protection** configurations for email and endpoints
* **RBAC/IAM** system for intranet portal

## 🛠️ Technologies Used

* Microsoft Purview
* Microsoft Entra ID
* Microsoft Defender for Office 365
* Compliance Center
* Security Center
* Azure AD Authentication
* MSAL.js

## 📁 Folder Contents

```
03-security-lab/
├── auth-config.json              # RBAC configuration
├── authMiddleware.js            # Authentication middleware
├── policy-exports/              # JSON exports of security policies (mock)
├── screenshots/                 # Security center configurations
├── compliance-report.xlsx       # Sample compliance audit
├── architecture-diagram.png     # Security architecture
└── README.md
```

## ✅ Skills Demonstrated

* Information protection policy design
* Compliance framework implementation
* Identity and access management
* Threat protection configuration
* Security reporting and monitoring
* Azure AD integration
* RBAC implementation

## 📘 Documentation & Notes

* DLP policies prevent sharing of sensitive content externally
* Sensitivity labels automatically encrypt confidential documents
* Conditional access requires MFA for all admin portals
* RBAC system uses Azure AD groups for role assignments

## 📌 Future Enhancements

* Add insider risk management policies
* Implement privileged identity management
* Expand to Microsoft Sentinel integration
* Add audit logging for RBAC events

> ⚠️ Note: All configurations use simulated policies and test data