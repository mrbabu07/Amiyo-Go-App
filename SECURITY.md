# Security Policy

## Supported versions

Amiyo-Go is pre-release. Only the latest commit on `main` is eligible for security fixes. No deployed build is considered production-supported until `npm run release:check` reports ready and the external release gates are approved.

## Reporting a vulnerability

Report vulnerabilities privately through the repository's GitHub Security Advisory **Report a vulnerability** flow. Do not open a public issue for an unpatched vulnerability.

Include:

- affected commit SHA and component;
- reproducible steps with synthetic data;
- expected and observed authorization boundary;
- impact and any known workaround.

Never include passwords, access tokens, private keys, production customer data, payment credentials, signed storage URLs, or live provider references. Revoke and rotate any credential exposed during testing.

## Scope

High-priority areas include authentication and role boundaries, object ownership, checkout idempotency, payment/refund callbacks, payout and commission ledgers, upload authorization, admin operations, delivery callbacks, secrets, and deployment workflows.

Automated tests and audit output are supporting evidence, not proof that a report is invalid. Security fixes require focused regression coverage, secret scanning, and the applicable full release gates before promotion.
