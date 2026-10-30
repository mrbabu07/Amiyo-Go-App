# Dependency Risk Register

Last reviewed: 2026-10-30

## Release rule

High or critical findings in the complete install graph block production promotion. A clean API or worker runtime audit does not waive a mobile build-chain finding. `npm audit fix --force` is prohibited when it would replace the supported Expo SDK with an incompatible version.

Any temporary acceptance must name the security approver and release owner, identify the exact release commit, state an expiry no later than 30 days, and attach the current audit plus Expo Doctor evidence. Until that record exists, `npm run release:check` must remain blocked.

## Current high findings

| Advisory | Installed path | Exposure | Current control | Resolution condition |
| --- | --- | --- | --- | --- |
| `GHSA-mrhx-c7xc-m3w5` | Expo CLI -> `zod@3.25.76` | CLI validation can be forced into excessive allocation by oversized constrained collections; application packages use patched `zod@4.6.7` | Build inputs and app configuration are repository-controlled; API and worker runtime audits are clean | Upgrade to a compatible Expo CLI using patched Zod, then rerun all release gates |

NPM reports three high package nodes because the remaining Zod advisory propagates through `@expo/cli`, `expo`, and `zod`. These are not three independent vulnerabilities. The previous `node-forge` advisory is resolved by the compatible `1.4.2` override.

## Current compatibility evidence

- `expo@58.0.21`, `@expo/cli@58.1.17`, and `expo-router@58.0.28` are installed.
- Expo's certificate tooling resolves to patched `node-forge@1.4.2`.
- `firebase-tools@15.34.2` is exact-pinned and the compatible `fast-uri@3.1.9` patch is installed; this removed the URI-parser advisory from the complete graph. Its current dev-only emulator/CLI graph still carries six moderate package nodes through Google Pub/Sub, OpenTelemetry, Hono, Gaxios and UUID. npm proposes a Firebase CLI 14 downgrade rather than a compatible 15.x remediation, so production runtime promotion remains governed by the clean API/worker audits while this tooling risk stays explicitly tracked.
- Expo Doctor passes all 20 checks.
- Mobile strict type-check and all 496 mobile tests pass.
- The complete monorepo build and 1,174-test run pass on 2026-10-29. The configured PostgreSQL database also accepted the operational query-index migrations.
- Expo web production export completes.
- API and worker runtime audits report zero findings.
- Pull-request and main-branch CI hard-fail on high or critical findings in the deployable API and worker runtime graphs through `npm run audit:runtime`. The complete install graph is still audited by `npm run release:check`; its Expo build-tool advisory continues to block production promotion until compatible remediation or approved time-bounded acceptance exists.
- The complete dependency audit currently reports three high, six moderate, and five low package nodes. The three high Expo nodes remain the production blocker described above; the six moderate nodes are confined to the Firebase CLI development/emulator graph. This document records risk but does not approve it.

## Review procedure

1. Check compatible Expo SDK 58 patch releases before every production candidate.
2. Prefer an upstream-compatible patch; never override Expo's Zod major or certificate dependencies blindly.
3. Run `npx expo-doctor apps/mobile`, mobile type-check/tests, web export, secret scan, and `npm run release:check` after an update.
4. Remove resolved rows and retain the audit artifact with the release record.
5. If no compatible patch exists, obtain the explicit, expiring security acceptance described above or do not promote.
