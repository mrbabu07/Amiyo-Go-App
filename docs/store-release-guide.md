# Mobile Store Release Guide

## Prepare

1. Approve final app name, Android package ID, iOS bundle ID, icons, splash, screenshots, localized copy, support URL, privacy policy, terms, and account-deletion URL.
2. Configure the Expo project, Apple team, Play Console app, signing credentials, restricted public keys, Sentry releases/source maps, and staging/production EAS environment values.
3. Increment app version/runtime version and native build numbers in `apps/mobile/app.json`.

## Build and verify

1. From `apps/mobile`, authenticate with the organization Expo account.
2. Build preview binaries with the `preview` profile and production candidates with the `production` profile in `apps/mobile/eas.json`.
3. Test identical candidates on supported real Android/iOS devices for roles, critical commerce flows, offline/error/permission states, deep links, push routing, accessibility, privacy disclosures, and logout cleanup.
4. Record binary identifiers, commit SHA, runtime version, test devices/OS versions, results, crash-free evidence, and approvers.

## Submit and promote

Submit only approved binaries to Play internal testing and TestFlight first. Promote the tested binary rather than rebuilding it. Use EAS channels only for runtime-compatible updates and never use OTA updates to bypass native/store review requirements.

Submission is blocked until final metadata, legal/privacy decisions, store accounts, signing ownership, and real-device evidence are provided.
