# ADR 0002: Authentication and Authorization

Status: Proposed

## Context

The legacy app uses Firebase client auth and server-side role checks. Vendor and admin permissions are partly role-based and partly resource-specific.

## Decision

Use Firebase/provider access tokens for identity verification and PostgreSQL for local users, roles, vendor membership, staff permissions, devices, push tokens, sessions, and audit logs.

Authorization must check:

- User role.
- Account status.
- Vendor membership.
- Staff permission.
- Resource ownership.
- Operational/geographic scope.
- Step-up authentication for payout, bank, KYC, role, and destructive actions.

## Consequences

- Firebase remains an identity provider, not the source of business authorization truth.
- Permission policies live centrally in `packages/domain` and are enforced by API services.
- Mobile hides unavailable actions, but API authorization remains authoritative.
