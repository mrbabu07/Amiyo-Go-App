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
```

The role flows clear application state, sign in through the real staging Firebase project, then verify protected customer account/orders, seller dashboard/orders, and admin dashboard/order-operations routes. The camera-denial flow uses Maestro's native permission control to prove the QR screen keeps manual verification available when camera access is rejected. For the signed-document flow, obtain a newly issued invoice or parcel payload from the same staging customer immediately before the run; never commit it because signed codes expire and contain operational identifiers. The flow accepts either a matching current record or an explicit signed-record mismatch, while still requiring the live reference and current status. Record device model, OS version, app commit/build, API release, duration, screenshots, failures, and tester. These smokes do not replace camera-based QR decoding, checkout, push, offline recovery, PDF sharing, refund, return, or payout acceptance.
