# Customer/vendor return detail follow-up — 2026-10-03

## Reference inspection and fixes

Compared `Client/src/pages/Returns.jsx` and `Client/src/components/ReturnStatusTracker.jsx` with the rebuilt return list/detail screens. This was source inspection, not rendered visual acceptance.

The rebuilt list used an unscoped `returns` query key and a non-reactive Firebase snapshot. It now subscribes to the current account, includes UID in its cache key and renders sign-in guidance rather than cached return content when signed out.

The detail screen previously fetched the latest 100 returns and searched that page for the requested ID. Dedicated GET endpoints now load an individual customer/vendor return with the ownership predicate inside the query, UUID route validation and no-store response headers. Detail access is no longer limited to the first page. The vendor scope intentionally matches the existing workspace's first vendor membership. These are not elevated admin detail endpoints.

Customer/vendor detail caches now include UID, and local seller form state remounts per account/return/view. Submission, successful completion and evidence-upload completion check the live account and component lifetime. An already accepted server mutation is not cancelled by changing accounts.

The endpoint contracts are included in the regenerated OpenAPI document. Service tests cover scoped queries, old return IDs, missing/unowned records, inactive accounts, missing permissions and missing vendor membership. The authenticated smoke adds customer detail and customer-to-vendor-detail denial checks against existing fixtures, without creating returns.

## Still open

Validation: full `npm test` including 91 repository script checks, mobile type-check, secret scan and whitespace checks passed. All 31 authenticated runtime smoke checks passed without skips, including an existing customer's own return detail and denial of customer access through the vendor endpoint. No live business records were created.

- Rendered reference comparison and offline/account-switch browser/device journeys.
- Customer reference wizard, refund method/account handling and event-backed timeline must be audited against supported provider policy; labels must not imply unsupported automatic wallet refunds.
- The legacy reference has delivery-based return-window behavior. Creation currently checks delivered-package ownership and quantities; configured window enforcement needs a separate policy/implementation audit, including admin extensions and replay behavior.
- Full provider, finance and physical-device launch gates remain unchanged.
