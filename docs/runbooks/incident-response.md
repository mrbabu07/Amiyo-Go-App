# Incident Response

## Trigger

Open an incident for elevated error rate, readiness failure, queue backlog, duplicate financial effects, delivery callback failures, suspected data exposure, or mobile crash regression.

## Response

1. Assign incident commander, operations lead, communications lead, and scribe.
2. Record UTC start time, affected environment, commit SHA, mobile runtime version, correlation IDs, and customer impact.
3. Stop risky mutations or disable the affected feature flag; do not delete evidence.
4. Roll back the API/worker image by immutable SHA when application code is responsible. Use forward database remediation unless a reviewed rollback migration exists.
5. Preserve redacted logs, queue/job IDs, audit events, provider event IDs, and database snapshots.
6. Verify health, readiness, queue age, error rate, payment/order invariants, and critical mobile flows before resolving.
7. Publish a post-incident review with cause, timeline, corrective actions, owners, and due dates.

## Security escalation

Revoke exposed credentials, isolate affected access, preserve audit evidence, and notify the approved privacy/security contacts. Never paste secrets or personal data into tickets or chat.
