# Recorded return timeline — 2026-10-03

Compared the reference `Client/src/components/ReturnStatusTracker.jsx` with the rebuilt customer/vendor detail. The rebuilt screen previously marked all preceding states complete based on an array index, and replaced the entire history with a rejected label on rejection. That could imply inspections, pickups or refunds without a corresponding event.

Owned customer/vendor detail now selects recorded return events in chronological order, exposing only event ID, previous/new status and timestamp. Internal notes, actors, evidence metadata and storage keys are neither selected nor serialized. Existing ownership and permission predicates remain unchanged. The screen renders these timestamps, retains history on rejection and explicitly reports unavailable history rather than inventing stages. It refreshes every 30 seconds while enabled. Refund preference is displayed as a preference, not proof of provider payment.

The optional contract fields preserve compatibility with list and mutation payloads; the detail endpoint returns its event array even when empty. No migration or fabricated historical events are required. Public event projection and ownership are service-tested; mobile tests cover contract validation and wiring but not rendered interaction. Authenticated smoke now requires detail events, rejects additional internal event fields and checks chronological timestamps.

Remaining: rendered mobile/desktop reference acceptance, complete multi-store return/refund journeys, real private-file storage and payment-provider verification. No whole-project completion is claimed.

Validation: build, mobile type-check, full test suite (91 repository checks), 69 mobile tests, two smoke-runner tests, OpenAPI generation, secret scan and whitespace check passed. Rebuilt API on temporary port 4010 passed all 31 authenticated smoke checks without skips against existing fixtures, including the strict public timeline contract. The temporary process was stopped afterward; no returns or orders were created.
