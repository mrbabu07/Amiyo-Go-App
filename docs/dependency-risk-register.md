# Dependency Risk Register

Last reviewed: 2026-10-26

## Release rule

High or critical findings in the complete install graph block production promotion. A clean API or worker runtime audit does not waive a mobile build-chain finding. `npm audit fix --force` is prohibited when it would replace the supported Expo SDK with an incompatible version.

Any temporary acceptance must name the security approver and release owner, identify the exact release commit, state an expiry no later than 30 days, and attach the current audit plus Expo Doctor evidence. Until that record exists, `npm run release:check` must remain blocked.

## Current high findings

| Advisory | Installed path | Exposure | Current control | Resolution condition |
| --- | --- | --- | --- | --- |
| `GHSA-86w9-cpqp-85rv` | Expo CLI -> `@expo/code-signing-certificates` -> `node-forge@1.4.0` | Build/code-signing tooling; not loaded by the API or worker runtime | Release builds run in protected CI; immutable commit and image provenance are required; untrusted signing inputs are not accepted | Upgrade to a compatible Expo release whose certificate chain uses a patched dependency, then rerun Doctor, export and full regression |
| `GHSA-mrhx-c7xc-m3w5` | Expo CLI -> `zod@3.25.76` | CLI validation can be forced into excessive allocation by oversized constrained collections; application packages use patched `zod@4.6.7` | Build inputs and app configuration are repository-controlled; API and worker runtime audits are clean | Upgrade to a compatible Expo CLI using patched Zod, then rerun all release gates |

NPM reports five high package nodes because the two advisories propagate through `@expo/cli`, `@expo/code-signing-certificates`, `expo`, `node-forge`, and `zod`. These are not five independent vulnerabilities.

## Current compatibility evidence

- `expo@58.0.19`, `@expo/cli@58.1.15`, and `expo-router@58.0.26` are installed.
- `firebase-tools@15.34.1` is exact-pinned and the compatible `fast-uri@3.1.9` patch is installed; this removed the URI-parser advisory from the complete graph.
- Expo Doctor passes all 20 checks.
- Mobile strict type-check and all 468 mobile tests pass.
- The complete monorepo build and 1,122-test run pass on 2026-10-27. The configured PostgreSQL database also accepted the operational query-index migration.
- Expo web production export completes.
- API and worker runtime audits report zero findings.
- The complete dependency audit currently reports five high and five moderate package nodes. The five high nodes remain the production blocker described above; this document records risk but does not approve it.

## Review procedure

1. Check compatible Expo SDK 58 patch releases before every production candidate.
2. Prefer an upstream-compatible patch; never override Expo's Zod major or certificate dependencies blindly.
3. Run `npx expo-doctor apps/mobile`, mobile type-check/tests, web export, secret scan, and `npm run release:check` after an update.
4. Remove resolved rows and retain the audit artifact with the release record.
5. If no compatible patch exists, obtain the explicit, expiring security acceptance described above or do not promote.
