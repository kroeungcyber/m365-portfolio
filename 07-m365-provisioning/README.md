# M365 Workplace Automation Provisioner

[![Zero Trust](https://img.shields.io/badge/Security-Zero%20Trust-blue.svg)](../03-security-lab/ZERO-TRUST.md)
[![PowerShell](https://img.shields.io/badge/PowerShell-7.0%2B-blue.svg)](https://github.com/PowerShell/PowerShell)
[![PnP PowerShell](https://img.shields.io/badge/PnP-PowerShell-orange.svg)](https://pnp.github.io/powershell/)

## 📝 Summary

This module provides a **declarative, automated M365 workplace provisioner** that reads a single `workspace-config.json` file and provisions your entire Microsoft 365 environment — SharePoint sites, Teams, Entra ID groups, and policy documentation — in one command.

Security-hardened from the ground up: no hardcoded credentials, full audit logging, dry-run mode, and least-privilege service principal design.

---

## 🚀 Quick Start

### Prerequisites

```powershell
# Install required modules
Install-Module PnP.PowerShell -Scope CurrentUser
Install-Module Microsoft.Graph -Scope CurrentUser

# PowerShell 7.0+ required
pwsh --version
```

### 1. Configure Your Workspace

Edit `workspace-config.json` to define your organization's sites, teams, groups, and policies:

```json
{
  "organization": {
    "displayName": "Your Company",
    "tenantDomain": "yourcompany.onmicrosoft.com"
  },
  "sharepoint": { ... },
  "teams": [ ... ],
  "entraIdGroups": [ ... ]
}
```

### 2. Set Credentials (Environment Variables — Never Hardcode)

```powershell
$env:M365_TENANT_ID     = "your-tenant-id-guid"
$env:M365_CLIENT_ID     = "your-service-principal-client-id"
$env:M365_CLIENT_SECRET = "your-service-principal-secret"
```

> 🔐 **Production tip:** Use Azure Key Vault or a Managed Identity instead of a client secret.

### 3. Dry Run (Preview — No Changes Made)

```powershell
.\Provision-M365Workplace.ps1 -DryRun
```

### 4. Full Provisioning

```powershell
.\Provision-M365Workplace.ps1
```

---

## 📦 What Gets Provisioned

| Resource | Details |
|:---|:---|
| **SharePoint Hub Site** | Communication site as the central intranet hub |
| **SharePoint Spoke Sites** | Department team sites (HR, Finance, IT, Legal) associated to hub |
| **Microsoft Teams** | Teams with custom channels per department |
| **Entra ID Groups** | Security and Microsoft 365 groups for RBAC |
| **DLP Policy Docs** | Markdown documentation of DLP policies (manual application via Purview) |
| **Audit Log** | Timestamped log of all provisioning actions |

---

## 🔐 Security Design

### Zero Trust Principles Applied

| Principle | Implementation |
|:---|:---|
| **No hardcoded secrets** | All credentials via environment variables or Key Vault |
| **Least privilege** | Service principal scoped to minimum required Graph API permissions |
| **Audit trail** | Every action logged to timestamped file in `./logs/` |
| **Safe by default** | `-DryRun` mode previews all changes before applying |
| **Idempotent** | Existing resources are detected and skipped (no duplicates) |

### Required Service Principal Permissions (Microsoft Graph)

| Permission | Type | Purpose |
|:---|:---|:---|
| `Sites.FullControl.All` | Application | Create and manage SharePoint sites |
| `Group.ReadWrite.All` | Application | Create Entra ID groups |
| `Team.Create` | Application | Create Microsoft Teams |
| `Channel.Create` | Application | Create Teams channels |
| `Directory.ReadWrite.All` | Application | Read/write directory objects |

---

## 📁 Folder Contents

```
07-m365-provisioning/
├── Provision-M365Workplace.ps1   # Main provisioning script
├── workspace-config.json         # Declarative workplace configuration
├── logs/                         # Auto-created: audit logs + DLP docs
└── README.md
```

---

## ⚙️ Configuration Reference (`workspace-config.json`)

### Organization
```json
"organization": {
  "displayName": "Company Name",
  "tenantDomain": "company.onmicrosoft.com",
  "adminEmail": "admin@company.onmicrosoft.com"
}
```

### SharePoint Sites
```json
"sharepoint": {
  "hubSite": { "title": "...", "url": "/sites/hub", "template": "CommunicationSite" },
  "spokeSites": [
    { "title": "HR", "url": "/sites/hr", "template": "TeamSite", "sensitivityLabel": "Confidential" }
  ]
}
```

### Teams
```json
"teams": [
  {
    "displayName": "IT Security",
    "visibility": "Private",
    "channels": [
      { "name": "Incidents", "description": "Security incident tracking" }
    ]
  }
]
```

### Entra ID Groups
```json
"entraIdGroups": [
  { "displayName": "M365-Admins", "mailNickname": "m365-admins", "groupType": "Security", "role": "admin" }
]
```

---

## 📌 Future Enhancements

- Add sensitivity label application via Microsoft Purview API
- Add Conditional Access policy creation via Graph API
- Add Power Platform environment provisioning
- Add Teams app installation (tab apps, bots)
- Add CI/CD pipeline integration (GitHub Actions / Azure DevOps)

> ⚠️ Note: All configurations use simulated/example data. Update `workspace-config.json` with your actual tenant details before running.
