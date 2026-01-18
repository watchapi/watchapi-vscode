# Security Policy

> Maintained with AI assistance and reviewed by project maintainers.

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| < 0.2   | :x:                |

## Reporting a Vulnerability

We take the security of WatchAPI Client seriously. If you discover a security vulnerability, please follow these steps:

### Please DO NOT

-   **DO NOT** open a public GitHub issue for security vulnerabilities
-   **DO NOT** disclose the vulnerability publicly until it has been addressed

### Please DO

1. **Report via GitHub Security Advisories**

    - Go to the [Security tab](../../security/advisories/new) in the repository
    - Click "Report a vulnerability"
    - Fill out the form with details

2. **Or Email Us Directly**
    - Send details to: security@watchapi.dev
    - Use the subject line: "Security Vulnerability Report"

### What to Include

Please provide as much information as possible:

-   **Description**: Clear description of the vulnerability
-   **Impact**: What can an attacker achieve?
-   **Steps to Reproduce**: Detailed steps to reproduce the issue
-   **Version**: Which version(s) are affected?
-   **Proof of Concept**: Code or screenshots demonstrating the vulnerability
-   **Suggested Fix**: If you have ideas on how to fix it

### What to Expect

-   **Acknowledgment**: We'll acknowledge receipt within 48 hours
-   **Updates**: We'll keep you informed about our progress
-   **Timeline**: We aim to release fixes for critical vulnerabilities within 7 days
-   **Credit**: We'll credit you in the security advisory (unless you prefer to remain anonymous)

## Security Measures

### Data Storage

-   All data is stored locally in VS Code's global storage
-   No data is transmitted without explicit user action
-   API credentials are stored securely using VS Code's secret storage API

### API Communication

-   All API requests use HTTPS
-   JWT tokens are used for authentication
-   Tokens are stored securely in VS Code's secret storage
-   Sensitive headers (Authorization, API keys) are masked in logs and UI

### Code Scanning

-   Automated dependency scanning via Dependabot
-   Regular security audits of dependencies
-   Automated CI/CD security checks

## Best Practices for Users

### Protecting Your Data

1. **Keep the extension updated** to the latest version
2. **Review permissions** before installing or updating
3. **Use strong passwords** for WatchAPI accounts
4. **Enable 2FA** if available on your WatchAPI account
5. **Be cautious** with custom API URLs and self-hosted instances

### Working with Sensitive Data

-   Avoid committing `.watchapi` or workspace files with sensitive data
-   Use environment variables for sensitive values in requests
-   Review endpoint configurations before sharing with team members
-   Use the secret storage feature for API keys and tokens

### Workspace Security

-   Be cautious when opening workspaces from untrusted sources
-   Review auto-imported endpoints before using them
-   Avoid running requests to untrusted endpoints
-   Use separate workspaces for different environments

## Known Security Considerations

### Local File Access

The extension reads files in your workspace to auto-import endpoints. Files are:

-   Only accessed when explicitly triggered by the user
-   Parsed using TypeScript AST (no code execution)
-   Limited to TypeScript/JavaScript files

### Network Requests

The extension makes HTTP requests to:

-   Your configured API endpoints (user-initiated)
-   WatchAPI backend (for sync and authentication)
-   Self-hosted instances (if configured)

All network activity is user-initiated or clearly documented.

## Security Updates

Security updates are released as soon as possible after a vulnerability is confirmed:

1. **Critical**: Released within 24-72 hours
2. **High**: Released within 7 days
3. **Medium**: Released within 30 days
4. **Low**: Included in next regular release

Updates are announced via:

-   GitHub Security Advisories
-   Release notes
-   VS Code Marketplace changelog

## Third-Party Dependencies

We regularly monitor and update dependencies to address known vulnerabilities:

-   Automated Dependabot alerts
-   Monthly dependency audits
-   Automated CI checks for vulnerable packages

## Scope

This security policy applies to:

-   WatchAPI Client VS Code Extension
-   Related parsers and utilities
-   API communication with WatchAPI backend

For security issues with:

-   **WatchAPI Backend**: Contact security@watchapi.dev
-   **VS Code**: Report to [Microsoft](https://www.microsoft.com/en-us/msrc/faqs-report-an-issue)

## Questions?

For general security questions (not vulnerabilities):

-   Open a [Discussion](../../discussions)
-   Email: hello@watchapi.dev

For vulnerabilities, always use the reporting process above.

---

Thank you for helping keep WatchAPI Client and our users safe! 🔒
