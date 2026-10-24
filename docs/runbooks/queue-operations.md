# Queue and Outbox Operations

## Current durable path

`READY_TO_SHIP` writes one `delivery.dispatch.requested` outbox event. The worker polls pending events, claims them, and submits BullMQ job `DELIVERY_READY_TO_SHIP` to queue `delivery-dispatch` with stable job ID `delivery-<dispatchId>`, eight attempts, and exponential backoff.

## Triage

1. Record UTC time, environment, worker image SHA, queue depth/oldest age, job ID, dispatch ID, outbox ID, attempt count, and correlation IDs.
2. Confirm PostgreSQL and Redis availability before restarting workers.
3. Inspect redacted structured logs and database state; never paste provider credentials or request snapshots into incident chat.
4. Restart the worker safely when the process is unhealthy. Claimed outbox rows become eligible again after their lease window.
5. Retry only after confirming the dispatch does not already have a successful external order ID. Provider calls use the dispatch idempotency key.
6. Verify one delivery dispatch, shipment, external order ID, attempt history, and processed outbox state.

Failed BullMQ jobs are retained. Use the mobile Admin Operations screen or `GET /api/v2/admin/delivery-queue` to inspect recent pending/failed dispatches. Retrying requires an operator reason and uses `POST /api/v2/admin/delivery-queue/{id}/retry` with an `Idempotency-Key`. Queue metrics/alerts are still required before release; direct Redis mutation is prohibited.

## Metrics and alerts

The worker emits structured `Worker queue metrics` log records every minute with waiting, active, delayed, failed, completed, and paused counts for every queue. This is the production path for the selected Render Background Worker, which has no public HTTP ingress. The same aggregate data is available as Prometheus text at `GET /metrics` on `WORKER_HEALTH_PORT` for local/internal diagnostics. Neither path exposes job payloads, customer data, provider references, or credentials; HTTP collection failure returns `503` instead of stale zeroes.

Configure Render log alerts for sustained failed jobs, growing waiting/delayed depth, collection failures, and missing worker heartbeats. If the deployment target later exposes a private scrape network, the same thresholds may consume `/metrics`. Dashboard and alert delivery evidence remain deployment requirements; source availability alone is not production acceptance.
