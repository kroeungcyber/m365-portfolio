# SECURITY.md

## Security Policy

This project is a portfolio showcase. While the configurations and code examples follow best practices for Microsoft 365 and Azure AD (Entra ID) security, it is not intended for direct production use without thorough review and customization.

### Reporting a Vulnerability

If you discover a security vulnerability within this portfolio, please do not open a public issue. Instead, contact the maintainer directly via the contact information provided in the [README.md](../README.md).

### Security Best Practices Implemented

- **Identity Management**: Uses Microsoft Entra ID (formerly Azure AD) for robust authentication and authorization.
- **RBAC (Role-Based Access Control)**: Demonstrates least-privilege principles by mapping Entra ID groups to specific application permissions.
- **Credential Safety**: All sensitive configurations are managed through environment variables. No secrets or IDs are hardcoded in the codebase.
- **Modern Auth**: Implements the MSAL (Microsoft Authentication Library) using the OBO (On-Behalf-Of) flow for secure service-to-service communication.
- **Data Protection**: Includes examples of DLP (Data Loss Prevention) and Sensitivity Labels in the `03-security-lab` documentation.
- **Compliance**: Follows Microsoft 365 security benchmarks for baseline protection.

### Disclaimer

This repository is for educational and demonstration purposes. The author is not responsible for any security incidents resulting from the use or adaptation of this code in other environments.
