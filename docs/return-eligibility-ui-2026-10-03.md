# Package return eligibility — 2026-10-03

Customer order detail now carries per-package return metadata: exact deadline, configured evidence requirement and eligibility reason. Read and creation paths share the same date calculation, including explicit admin extensions, exact expiry boundary and invalid delivery dates. Remaining quantities and delivered status determine whether a new request is available.

Malformed configured policy disables returns without hiding the owned order or invoice. Missing configuration retains the declared defaults. Database failures still propagate rather than masquerading as valid policy. Ownership is checked before loading policy; no new privileged endpoint is introduced.

The form displays the deadline in the customer's local time and labels evidence required/optional. A local timer disables expired requests without waiting for polling; prepare and submit recheck the deadline and required attachment count. The API remains authoritative. Missing metadata fails closed with refresh guidance. Previously committed requests retain their independent idempotent recovery path, including recovery after expiry.

Tests cover configured deadlines, extensions, expired/unverified packages, exhausted quantities, malformed policy and UI boundary calculations. These checks are not rendered browser/device acceptance. Staging delivery events, file uploads, account switching and full return/refund journeys remain open.

Validation: build, mobile TypeScript, full `npm test` (including 91 repository checks), all 67 mobile tests, OpenAPI generation, secret scan and whitespace check passed. No live business records were modified in this pass.
