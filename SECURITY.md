# Security Policy

## Supported versions

Security fixes target the latest release and the `main` branch. Older releases
may not receive fixes.

## Report a vulnerability

Use GitHub's **Security → Report a vulnerability** private reporting form. Do
not open a public issue for a suspected vulnerability.

Include:

- affected version or commit;
- impact and affected data;
- minimal reproduction steps;
- suggested mitigation, if known.

Never include a real portfolio secret, API key, access token, or another user's
data. Revoke and rotate any credential that may have been exposed.

The maintainer will acknowledge valid reports when possible, investigate, and
coordinate disclosure after a fix is available. This community project does not
promise a response-time SLA or a bug bounty.

## Security-sensitive areas

Extra care is required for changes involving:

- portfolio authentication and identity checks;
- SpacetimeDB views and client visibility filters;
- private market-data credentials;
- external HTTP requests and provider response parsing;
- Docker images, release workflows, and dependencies.

Incorrect or delayed market data is normally a data-quality bug. It becomes a
security issue when it enables unauthorized access, credential disclosure,
cross-portfolio data exposure, or system compromise.
