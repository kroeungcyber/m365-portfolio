# SECURITY.md

## Security Policy

This project is a portfolio showcase. While the configurations and code examples follow best practices for Microsoft 365 and Azure AD (Entra ID) security, it is not intended for direct production use without thorough review and customization.

### Reporting a Vulnerability

If you discover a security vulnerability within this portfolio, please do not open a public issue. Instead, contact the maintainer directly via the contact information provided in the [README.md](./README.md).

### Security Best Practices Implemented

#### 🆔 Identity & Access Management (IAM)
- **Microsoft Entra ID Implementation**: Centralized identity management using modern protocols (OpenID Connect/OAuth 2.0).
- **Conditional Access (CA)**: Zero Trust principles applied via CA policies (MFA enforcement, device compliance, and location-based access).
- **Least Privilege (RBAC)**: Fine-grained access control mapping Entra ID groups to functional roles (Admin, Manager, Employee).
- **Secure Authentication Flow**: Implementation of the MSAL OBO (On-Behalf-Of) flow to securely propagate user identity across services.

#### 🛡️ Information Protection & DLP
- **Sensitivity Labeling**: Automated and manual labeling for data classification (e.g., "Highly Confidential" with encryption and watermarking).
- **Data Loss Prevention (DLP)**: Policies configured to detect and prevent accidental sharing of PII, PHI, or PCI data across Teams, SharePoint, and Exchange.
- **Safe Attachments/Links**: Integration with Microsoft Defender for Office 365 to provide time-of-click protection against malicious content.

#### ⚙️ Secure Configuration & DevOps
- **Credential Safety**: Strict adherence to "No Secrets in Code" using environment variables (`.env`) and template-based configurations.
- **Audit Logging**: Comprehensive logging of administrative actions and security events for compliance monitoring.
- **Dependency Management**: Regular auditing of third-party libraries to mitigate supply chain risks.
- **CORS Management**: Strict Cross-Origin Resource Sharing policies implemented to prevent unauthorized API access.

### 📊 M365 Security Benchmark Alignment
This portfolio's security implementations are aligned with the following industry standards:

| Benchmark | Implementation Detail |
| :--- | :--- |
| **CIS M365 v3.0** | MFA enforcement, Conditional Access, and strict RBAC. |
| **NIST 800-53** | Identity proofing, access control, and continuous monitoring. |
| **GDPR** | Data Loss Prevention (DLP) and automated retention policies. |
| **Zero Trust** | "Never Trust, Always Verify" applied to every API request. |

### Disclaimer

This repository is for educational and demonstration purposes. The author is not responsible for any security incidents resulting from the use or adaptation of this code in other environments.
