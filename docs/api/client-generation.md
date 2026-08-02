# API Contracts and Client Generation

`packages/contracts` is authoritative for this monorepo. Mobile code imports its Zod schemas and inferred TypeScript types directly; do not duplicate DTO interfaces.

## Regenerate OpenAPI

Run:

```text
npm run openapi:generate
git diff -- docs/api/openapi.json
```

CI fails when generation changes the committed document.

## External clients

External consumers may generate a client from `docs/api/openapi.json` with their approved pinned OpenAPI generator. Commit the generator name/version and generated-client compatibility test in the consuming repository. Regeneration must not modify the source OpenAPI document.

Breaking changes require a new API version or an approved compatibility migration. RFC 7807 problem payloads and stable application error codes remain part of the public contract.
