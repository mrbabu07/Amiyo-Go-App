# Greenfield Data Launch Policy

Status: Approved for Amiyo-App release one  
Effective: 2026-10-24

Amiyo-App is a separate greenfield marketplace. The sibling legacy `Client` and `Server` projects are behavioral and visual references only; their MongoDB data is not an authoritative production source for Amiyo-App and must not be copied into the new production database by default.

## Launch data source

- Production starts from committed Prisma migrations and an empty database.
- Categories, configuration, roles and launch catalog are created through reviewed Amiyo-App seed/import/admin workflows.
- Local demo users, demo orders, sandbox payments and synthetic migration rehearsals are forbidden in production.
- The checked-in `prisma/seed.ts` is for local/demo acceptance unless an operator reviews and replaces every demo identity, listing, price, stock and media reference before a controlled production catalog load.

## Legacy isolation

- Do not connect Amiyo-App production services to the legacy MongoDB database.
- Do not import legacy customer identities, passwords/tokens, addresses, orders, payment records, seller KYC, chat, evidence or audit data without a separately approved migration project.
- Legacy source code may be inspected for parity; it is not deployed inside the Amiyo-App repository or Render services.
- Any future import requires sanitized exports, complete collection mapping, two production-scale rehearsals, exact reconciliation, legal basis and named engineering/finance/operations approval. The existing migration tooling and cutover runbook remain contingency controls for that future project.

## Release evidence

- Production database creation records the migration IDs and empty/preload row counts.
- Production catalog loading retains input checksum, operator, reviewer, rejected-row report and resulting product/inventory counts.
- Release smoke evidence must prove no demo account, sandbox transaction, synthetic rehearsal identifier or legacy database endpoint is exposed.
