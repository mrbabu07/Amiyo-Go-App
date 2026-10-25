# Data Retention Approval

- Policy version / commit:
- Effective date:
- Privacy/legal approver, organization, date, signature:
- Finance approver, date, signature:
- Operations approver, date, signature:
- Security approver, date, signature:
- Financial retention approved (seven years): Yes / No
- KYC/evidence retention approved (seven years): Yes / No
- Support/chat retention approved (two years, subject to linked holds): Yes / No
- Legal-hold owner and review cadence:
- Firebase retention/deletion configuration evidence:
- SSLCommerz retention/export configuration evidence:
- Render/Neon/Redis retention and backup evidence:
- Sentry/Resend/delivery-provider retention evidence:
- Purge drill report and commit:
- Exceptions and expiry date:
- Final production approval: Yes / No

## Machine-readable release evidence

After the approvals and purge drill are complete, store a strict JSON document in the protected GitHub production Environment secret `RETENTION_APPROVAL_EVIDENCE_JSON`. Never include provider credentials, customer data, database URLs, raw document references, or signatures; use SHA-256 hashes of the private supporting evidence.

The JSON must contain exactly:

```json
{
  "schemaVersion": 1,
  "environment": "production",
  "policyHash": "<sha256 of docs/data-retention-policy.md>",
  "approvedAt": "2026-10-25T00:00:00.000Z",
  "effectiveAt": "2026-10-25T00:00:00.000Z",
  "approvers": {
    "privacyLegal": "Named person",
    "finance": "Different named person",
    "operations": "Different named person",
    "security": "Different named person"
  },
  "periods": {
    "financialYears": 7,
    "kycEvidenceYears": 7,
    "supportChatYears": 2,
    "auditSecurityYears": 7
  },
  "holds": { "owner": "Named owner", "reviewCadenceDays": 30, "tested": true },
  "providers": {
    "firebase": { "configured": true, "evidenceHash": "<sha256>" },
    "sslcommerz": { "configured": true, "evidenceHash": "<sha256>" },
    "render": { "configured": true, "evidenceHash": "<sha256>" },
    "neon": { "configured": true, "evidenceHash": "<sha256>" },
    "redis": { "configured": true, "evidenceHash": "<sha256>" },
    "sentry": { "configured": true, "evidenceHash": "<sha256>" },
    "resend": { "configured": true, "evidenceHash": "<sha256>" },
    "delivery": { "configured": true, "evidenceHash": "<sha256>" }
  },
  "purgeDrill": {
    "executedAt": "2026-10-25T00:00:00.000Z",
    "operator": "Named operator",
    "approver": "Independent reviewer",
    "reportHash": "<sha256>",
    "heldRecordsPreserved": true,
    "eligibleRecordsRemoved": true,
    "noOrphans": true
  }
}
```

Validate a private file with `RETENTION_APPROVAL_EVIDENCE_PATH=<path> npm run release:retention-evidence`. The production deploy workflow materializes the protected secret and `npm run release:check` clears the Data retention decision only when this evidence matches the current policy. A policy edit changes its hash and requires renewed approval.
