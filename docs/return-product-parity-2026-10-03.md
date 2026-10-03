# Return product presentation — 2026-10-03

The reference customer returns view identifies the purchased product. Amiyo-App's return detail instead showed an abbreviated order-item UUID and a generic cube; the customer/seller lists showed no item preview.

Customer/admin return lists, seller workspace lists and owned customer/seller detail now load product names, SKUs and variant attributes from the order-item purchase snapshot. Product media selects only the first ordered image. Images are current catalog media, not a historical image snapshot; missing/unconfigured/broken media uses the existing accessible image fallback. Return quantities and requested amounts remain the persisted return line values.

A shared non-interactive row component displays the same information across customer list, seller list and detail, without nested buttons. Text stays in a shrinking column beside the image for narrow screens. Seller lists now subscribe to authentication, scope cache keys by account and hide results after sign-out. Failed list loads no longer also announce that there are no returns.

Browser connection was retried and failed before opening a page: `failed to write kernel assets: The system cannot find the path specified`. No rendered visual acceptance is claimed. Source checks are explicitly only wiring checks; actual 360px/device comparison and account-switch interactions remain open.

Validation so far: build, mobile type-check, full suite including 91 repository checks, 71 mobile tests, two smoke-runner tests, OpenAPI generation, secret scan and whitespace check passed. Product snapshot, image fallback and scoped detail mapping have service/pure tests. No schema migration or new live business record is required.

Rebuilt API on temporary port 4010 passed all 32 authenticated runtime smoke checks without skips, including product-aware customer return list/detail and the added vendor return-list endpoint. The temporary API was stopped afterward. This verifies existing fixtures and read contracts, not a complete write lifecycle or rendered UI.
