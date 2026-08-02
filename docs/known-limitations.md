# Known Limitations and Technical Debt

## Production blockers

- Business, provider, privacy, retention, package identity, deployment, and migration decisions remain unresolved in `docs/decisions-needed.md`.
- Phase 9 lacks two production-scale rehearsals and signed reconciliation approval.
- No managed staging/production deployment, alert dashboard, backup restore evidence, load/security report, or real-device E2E evidence is available.
- EAS/store projects, final brand assets, signing ownership, metadata, and privacy disclosures are not configured.
- Firebase web configuration is available locally, but server Admin credentials, approved sign-in methods, native app registrations, authorized domains, Analytics consent, and test identities are not complete.

## Technical debt

- npm audit has moderate transitive findings in mobile/native tooling; critical/high findings are blocked by CI.
- Failed BullMQ jobs are durable and have authenticated API/mobile retry controls, but complete queue metrics and alert dashboards are still required.
- Push delivery, automatic loyalty mutation, promotion stacking, automatic settlement, provider-specific refunds, and several operations flows intentionally remain disabled pending approved rules/providers.
- Object-storage upload/media processing and final Sentry/OTel exporters require selected providers.
- Current automated mobile coverage validates source semantics and web export; Android/iOS component and Maestro/Detox suites still require devices and staging identities.

Do not remove a limitation merely because code exists. Close it only with the required external evidence and named approval.
