# Customer return evidence intake

Customer return selection now supports up to five optional image/PDF uploads using the existing private `return_evidence` upload pipeline. The form lists filenames, supports removing attachments from the selection, shows the evidence count in review, and disables review/submit during upload. A completed upload after account switching is not added to the new account's form.

The API validates ownership, purpose, private visibility and completed upload status inside the return transaction before recording attachment keys in the initial customer ReturnEvent metadata. Duplicate/over-limit keys are rejected. The optional contract field preserves existing clients. This does not publish private files or require a database migration.

Validation covers evidence ownership query constraints, absent uploads, duplicate/over-limit attachments and backward-compatible payloads. Existing media validation checks uploaded size/MIME metadata; this is not a claim of malware scanning.

Checks passed: workspace build and full `npm test` (workspace suites plus 91 repository tests), final mobile type-check and 55 mobile tests, secret scan and whitespace checks.

Still required: authorized reviewer download/preview UI and short-lived private read URLs, browser/device upload acceptance with configured storage, orphan-upload retention/cleanup and network-retry acceptance. Removing a file from the form does not delete the uploaded storage object. Evidence intake is implemented, not the complete evidence-review workflow. No real file was uploaded or return submitted during these tests.
