# Customer return evidence intake

Customer return selection now supports up to five optional image/PDF uploads using the existing private `return_evidence` upload pipeline. The form lists filenames, supports removing attachments from the selection, shows the evidence count in review, and disables review/submit during upload. A completed upload after account switching is not added to the new account's form.

The API validates ownership, purpose, private visibility and completed upload status inside the return transaction before recording attachment keys in the initial customer ReturnEvent metadata. Duplicate/over-limit keys are rejected. The optional contract field preserves existing clients. This does not publish private files or require a database migration.

Validation covers evidence ownership query constraints, absent uploads, duplicate/over-limit attachments and backward-compatible payloads. Existing media validation checks uploaded size/MIME metadata; this is not a claim of malware scanning.

Checks passed: workspace build and full `npm test` (workspace suites plus 91 repository tests), final mobile type-check and 55 mobile tests, secret scan and whitespace checks.

Still required: authorized reviewer download/preview UI and short-lived private read URLs, browser/device upload acceptance with configured storage, orphan-upload retention/cleanup and network-retry acceptance. Removing a file from the form does not delete the uploaded storage object. Evidence intake is implemented, not the complete evidence-review workflow. No real file was uploaded or return submitted during these tests.

## Admin evidence access follow-up

Added an admin evidence list and explicit access endpoint. Both require an active operations/finance/super admin with `returns:manage`. Uploads must be referenced by this return's event metadata, owned by that event's actor, private, completed and intended as return evidence. No arbitrary storage-key signing endpoint is exposed.

Listing returns names/types/IDs, not storage keys or signed URLs. Access requests are audited without recording the URL and return a five-minute read URL with `Cache-Control: no-store`. Images may be previewed; PDFs and other MIME types are forced to attachment disposition. URLs remain bearer credentials until expiry; they must not be shared.

The admin panel has account-scoped queries, image preview, explicit open/download controls, expired-preview cleanup and errors/retry. New URLs are obtained only on user action. A response after account switching or unmount is not opened. Browser/OS download behavior and actual Firebase signing still require acceptance with configured storage. Tests use a fake signer, not real uploaded evidence.

The earlier reviewer-access gap is implemented in code. Orphan cleanup, full upload-to-review browser/device E2E and ambiguous transport recovery remain open.

Access follow-up validation: full `npm test` passed (workspace suites and 91 repository tests), final mobile type-check and 56 mobile tests passed, and secret/whitespace checks passed. API tests cover role/status/permission rejection, unrelated uploads, event-owner scoping, URL-free listings, audit-before-signing and attachment-only PDF access.
