# Known Limitations and Technical Debt

## Production blockers

- Business, provider, privacy, retention, package identity, deployment, and migration decisions remain unresolved in `docs/decisions-needed.md`.
- Phase 9 lacks two production-scale rehearsals and signed reconciliation approval.
- Sentry mobile crash capture, source-map-aware Metro output, and global offline state are implemented; no managed staging/production deployment, alert dashboard, backup restore evidence, load/security report, or real-device E2E evidence is available.
- EAS/store projects, final brand assets, signing ownership, metadata, and privacy disclosures are not configured.
- Firebase web configuration is available locally, but server Admin credentials, approved sign-in methods, native app registrations, authorized domains, Analytics consent, and test identities are not complete.

## Technical debt

- npm audit has no critical findings, but high/moderate transitive findings remain in the Expo/Metro/React Native production dependency graph; Firebase CLI findings are development-only. Available npm fixes currently require incompatible major-version downgrades or upgrades, so the release audit remains intentionally blocking until supported upstream patches are available and validated.
- Dependabot checks npm and GitHub Actions weekly and groups the coupled Expo/React Native runtime so compatibility changes are reviewed together. Automated pull requests are update candidates only; they must pass Expo compatibility, full regression, export and device acceptance before merge.
- Every third-party GitHub Action is pinned to an immutable commit SHA with its major release documented inline. Dependabot may propose reviewed SHA updates; mutable action tags are rejected by workflow contract tests.
- API and worker build/runtime stages pin the official multi-architecture Node 20 Alpine image by digest. Dependabot watches both Dockerfiles weekly; digest updates still require the complete container and regression gates.
- CODEOWNERS assigns the repository owner to all changes and explicitly covers workflows, schema/migrations, identity, payments, finance, admin, worker, release scripts and runbooks. GitHub branch protection must still be configured externally to require code-owner approval and passing checks before merge.
- `SECURITY.md` directs private vulnerability reports to GitHub Security Advisories, and the pull-request template requires authorization, migration, responsive UI, idempotency, audit and unresolved-decision checks. Repository settings must still enable private vulnerability reporting and protected-branch review enforcement.
- Failed BullMQ jobs are durable and have authenticated API/mobile retry controls, but complete queue metrics and alert dashboards are still required.
- Authenticated mutation limits are account-scoped and public abuse controls are route-scoped. Staging/production use namespaced Redis counters shared by every API replica and refuse to start without `REDIS_URL`; local/test runtimes intentionally retain isolated memory counters. Managed Redis capacity and alerting still require deployment evidence.
- Expo Push delivery now uses transactional outbox/BullMQ jobs and native token registration; EAS/FCM/APNs credentials remain operator configuration. Provider-specific refunds, promotion/voucher/flash precedence, loyalty mutation, expiry/reversal, and settlement proposals are implemented in `docs/business-rules-approval.md`; live-provider payout/refund evidence still requires finance/operator approval.
- Firebase Storage signed uploads and worker content validation are implemented; production service-account IAM, bucket CORS/CDN policy, and final Sentry/OTel exporters still require operator configuration.
- Current automated mobile coverage validates source semantics and web export; Android/iOS component and Maestro/Detox suites still require devices and staging identities.

Do not remove a limitation merely because code exists. Close it only with the required external evidence and named approval.
