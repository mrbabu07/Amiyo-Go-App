# Mobile Device E2E

Use a staging Android build of `com.amiyo.go` connected to the staging API and production-mode Firebase project. Never use emulator demo credentials or a production customer account.

## Preconditions

- Install Maestro and connect one physical Android device or approved emulator.
- Install the current staging APK built from the commit under test.
- Create dedicated staging customer, vendor, and admin identities with the expected database roles.
- Export credentials only in the invoking shell; do not write them to the repository, screenshots, or test reports.

## Run

```bash
maestro test -e CUSTOMER_EMAIL="$CUSTOMER_EMAIL" -e CUSTOMER_PASSWORD="$CUSTOMER_PASSWORD" .maestro/customer-smoke.yaml
maestro test -e VENDOR_EMAIL="$VENDOR_EMAIL" -e VENDOR_PASSWORD="$VENDOR_PASSWORD" .maestro/vendor-smoke.yaml
maestro test -e ADMIN_EMAIL="$ADMIN_EMAIL" -e ADMIN_PASSWORD="$ADMIN_PASSWORD" .maestro/admin-smoke.yaml
maestro test .maestro/camera-denial-smoke.yaml
maestro test -e CUSTOMER_EMAIL="$CUSTOMER_EMAIL" -e CUSTOMER_PASSWORD="$CUSTOMER_PASSWORD" -e DOCUMENT_QR_PAYLOAD="$DOCUMENT_QR_PAYLOAD" .maestro/signed-document-smoke.yaml
maestro test .maestro/offline-reconnect-smoke.yaml
```

The role flows clear application state, sign in through the real staging Firebase project, then verify protected customer account/orders, seller dashboard/orders, and admin dashboard/order-operations routes. The camera-denial flow uses Maestro's native permission control to prove the QR screen keeps manual verification available when camera access is rejected. For the signed-document flow, obtain a newly issued invoice or parcel payload from the same staging customer immediately before the run; never commit it because signed codes expire and contain operational identifiers. The flow accepts either a matching current record or an explicit signed-record mismatch, while still requiring the live reference and current status.

The offline/reconnect flow is Android-only. It enables airplane mode, requires the global offline notice, restores connectivity, and waits for the notice to disappear. Its `onFlowComplete` cleanup disables airplane mode after either a pass or failure so the next device test starts online. Record device model, OS version, app commit/build, API release, duration, screenshots, failures, and tester. These source flows do not replace recorded physical-device evidence for camera-based QR decoding, checkout, push, PDF sharing, refund, return, or payout acceptance.

## Validate Evidence

Store the run metadata in a private JSON file with `schemaVersion`, `environment`, `commitSha`, `apiRelease`, `tester`, `startedAt`, `finishedAt`, `app`, `device`, and one result for every flow named in `.maestro`. Do not include credentials, tokens, customer data, URLs, QR payloads, or screenshot contents. Every result requires `name`, `status: "passed"`, `durationSeconds`, and `screenshotCount`.

```bash
MOBILE_DEVICE_EVIDENCE_PATH=/secure/amiyo-device-run.json RELEASE_COMMIT_SHA=<40-character-app-commit> npm run release:mobile-evidence
```

The validator accepts Android physical-device/emulator evidence and iOS physical-device/simulator evidence. Android requires every listed flow, including offline/reconnect; iOS requires the role, camera-denial and signed-document flows but excludes the Android-only airplane-mode flow. It rejects the wrong package or commit, missing/failed/duplicate flows, runs older than fourteen days, future or four-hour runs, invalid platform/device combinations, and results without screenshot evidence. Keep the JSON and screenshots in the protected release evidence store; do not commit them.
