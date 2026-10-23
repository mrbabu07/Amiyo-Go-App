## Summary

- Change:
- Reason:
- Affected roles/workflows:

## Verification

- [ ] Focused tests cover the changed behavior and authorization boundaries.
- [ ] `npm run build` and applicable workspace tests pass.
- [ ] `npm run secret:scan` and `git diff --check` pass.
- [ ] API contract/OpenAPI changes are regenerated and reviewed when applicable.
- [ ] Prisma changes include a forward migration and rollback/cutover notes.
- [ ] Customer, seller, and admin UI changes are checked at 360px and desktop widths.
- [ ] Payment, refund, payout, commission, inventory, and order changes preserve idempotency and audit evidence.
- [ ] No unresolved business decision is silently encoded as an approved production rule.
- [ ] New environment values are documented without committing secrets.

## Release Evidence

- Risk and rollback:
- Test/evidence links:
- External provider/device checks still required:
