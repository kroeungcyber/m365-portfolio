# Microsoft 365 SME Digital Transformation Portfolio

[![SME Roadmap](https://img.shields.io/badge/Roadmap-SME%20Transformation-orange.svg)](SME-TRANSFORMATION.md)
[![Security Policy](https://img.shields.io/badge/Security-Policy-brightgreen.svg)](SECURITY.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Security Lab CI](https://github.com/kroeungcyber/m365-portfolio/actions/workflows/security-lab-ci.yml/badge.svg)](https://github.com/kroeungcyber/m365-portfolio/actions/workflows/security-lab-ci.yml)
[![Provisioner CI](https://github.com/kroeungcyber/m365-portfolio/actions/workflows/provisioner-ci.yml/badge.svg)](https://github.com/kroeungcyber/m365-portfolio/actions/workflows/provisioner-ci.yml)
[![GitHub Pages](https://github.com/kroeungcyber/m365-portfolio/actions/workflows/pages.yml/badge.svg)](https://kroeungcyber.github.io/m365-portfolio)

This portfolio demonstrates a comprehensive toolkit for **Digital Transformation in Small and Medium Enterprises (SMEs)**. By leveraging Microsoft 365, these projects show how SMEs can achieve enterprise-grade security, collaboration, and automation without a massive IT budget.

---

## 📁 Projects Overview

### 1. Ministry Intranet Portal (SharePoint + Teams)
[![Governance Policy](https://img.shields.io/badge/Policy-Governance-blue.svg)](01-intranet-portal/GOVERNANCE.md)

**Summary:** A full-featured intranet communication portal with integrated Teams collaboration, featuring advanced governance and automated metadata.

**Key Highlights:**
* **Hub-and-Spoke Architecture**: Scalable SharePoint site structure with centralized news and departmental spokes.
* **Automated Governance**: Detailed permission levels and content lifecycle management (documented in `GOVERNANCE.md`).
* **Intelligent Automation**: Power Automate workflows for cross-platform announcements (Teams/Outlook).

---

### 2. Workflow Automation for Leave Requests (Power Platform)

**Summary:** End-to-end automation of employee leave requests using the Power Platform, optimizing business processes and user experience.

**Key Highlights:**
* **Canvas App Interface**: High-fidelity Power Apps UI with dynamic form validation.
* **Multi-Stage Logic**: Complex approval workflows using Power Automate (Manager → HR sequential approvals).
* **Omnichannel Notifications**: Adaptive cards for Teams and customized Outlook notifications.

---

### 3. Security & Compliance Lab (Production-Ready Demo)
[![Security Policy](https://img.shields.io/badge/Policy-Security-brightgreen.svg)](03-security-lab/SECURITY.md)

**Summary:** A high-level security implementation featuring a **workable Node.js demo** of RBAC and identity management using Microsoft Entra ID.

**Key Highlights:**
* **Workable Demo**: Includes a production-ready Express server (`app.js`) with structured logging and environment validation.
* **Hardened Security**: Implements Helmet.js, Rate Limiting, and Joi validation for enterprise-grade API protection.
* **Identity Management**: Demonstrates MSAL OBO (On-Behalf-Of) flow and group-based access control.

---

### 4. Custom Teams App

**Summary:** Built a custom Teams tab app using Power Apps for internal event planning and document access.

**Features:**

* Power App embedded into Teams tab.
* Integrated with SharePoint event list.
* Graph API (mocked) for calendar integration.
* Responsive UI for both desktop and mobile.

**Skills Demonstrated:**

* Teams development, Power Apps, SharePoint integration, API design.

---

### 5. User Support & Training Portal

**Summary:** Created a self-help and training portal using SharePoint Online, Forms, Power BI, and Power Apps.

**Features:**

* SharePoint support site with how-to guides and embedded training videos.
* Forms-based training quiz and feedback.
* Power App for issue submission and routing.
* Power BI dashboard for usage analytics (mocked).

**Skills Demonstrated:**

* End-user enablement, content creation, Power BI integration, service adoption.

---

### 6. Documentation Library

**Summary:** Developed a documentation repository and publishing workflow using SharePoint and Power Automate.

**Features:**

* SharePoint library with versioning and change logs.
* Document approval workflow using Power Automate.
* Markdown-based templates for best practices and SOPs.

**Skills Demonstrated:**

* SharePoint content lifecycle management, governance documentation, workflow automation.

---

### 7. M365 Workplace Provisioner (PowerShell + Graph API)

**Summary:** A declarative, automated M365 workplace provisioner that reads a single `workspace-config.json` and provisions an entire Microsoft 365 environment — SharePoint sites, Teams, Entra ID groups, sensitivity labels, DLP policies, and Conditional Access settings — in one command.

**Key Highlights:**
* **Declarative Config**: All tenant resources defined in `workspace-config.json` — no imperative scripting required.
* **Zero Trust by Design**: No hardcoded credentials, least-privilege service principal, full audit logging, dry-run mode.
* **Idempotent**: Existing resources are detected and skipped — safe to re-run without creating duplicates.

**Skills Demonstrated:**

* PnP PowerShell, Microsoft Graph API, Entra ID governance, Infrastructure-as-Code for M365.

---

## 🧰 Tools Used

* SharePoint Online
* Microsoft Teams
* OneDrive for Business
* Power Apps
* Power Automate
* Microsoft Purview & Entra
* Power BI
* Microsoft Forms

---

## 📸 Screenshots & Exports

Each project folder includes:

* Mock data and schema
* Workflow or app export files
* UI screenshots
* Markdown documentation

---

## 🚀 Quick Start / Testing the Demo

To test the **Security Lab** production-ready demo:
1. Navigate to the module: `cd 03-security-lab`
2. Set up your environment: `cp .env.example .env` (Update with your Entra ID credentials)
3. Install dependencies: `npm install`
4. Start the server: `npm start`
5. Run the testing script: `./test-demo.sh`

## 🗂 Folder Structure

```
m365-portfolio/
├── 01-intranet-portal/        # SharePoint structure & Governance Framework
├── 02-workflow-automation/    # Power Platform apps & flows
├── 03-security-lab/           # Production-ready Security API & RBAC Demo
│   ├── app.js                 # Demo Server
│   ├── authMiddleware.js      # Entra ID Middleware
│   └── test-demo.sh           # Automated Testing Script
├── 04-custom-teams-app/       # Teams integration solutions
├── 05-training-support-portal/# User adoption & training resources
├── 06-documentation-library/  # Document lifecycle management
├── 07-m365-provisioning/      # Declarative PowerShell provisioner for full M365 tenant setup
├── SECURITY.md                # Project-wide Security Posture
└── README.md
```

---

## 📬 Contact

For inquiries, reach out via [LinkedIn](https://www.linkedin.com/company/kroeungcyber) or email.

---

> ⚠️ **Note:** All configurations, data, and screenshots are anonymized and simulated for demo and portfolio purposes only.
