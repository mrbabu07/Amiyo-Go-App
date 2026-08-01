# Phase 4: Catalog, Search, Shops, and Discovery

## Delivered

- Public category, cursor-paginated product, product detail, search, shop list, and shop detail APIs.
- Approved-product visibility rules requiring an approved vendor and active shop.
- Variant pricing with JSON-safe minor-unit strings and authoritative available inventory derived from on-hand minus reserved stock.
- Vendor product reads, draft creation, optimistic updates, submission, inventory reads, and idempotent inventory adjustment.
- Operations moderation for submitted products with explicit approve/reject decisions.
- Immutable product, inventory, submission, and moderation audit events.
- React Native and web category browsing, product lists, search results, product detail, shop list, and shop detail screens.
- Home discovery powered by API queries instead of static product/category arrays, including loading, retry, error, and empty states.
- Deterministic demo seed data across five categories, one verified shop, nine products, variants, inventory, and image references.

## Public API

```text
GET /api/v2/catalog/categories
GET /api/v2/catalog/products
GET /api/v2/catalog/products/:id-or-slug
GET /api/v2/catalog/search
GET /api/v2/shops
GET /api/v2/shops/:id-or-slug
```

Product queries support `cursor`, `limit`, `query`, `category`, and `shop`. Limits are bounded to 50. Only `APPROVED` products from approved vendors and active shops are returned.

## Protected API

```text
GET   /api/v2/vendor/products
POST  /api/v2/vendor/products
PATCH /api/v2/vendor/products/:id
POST  /api/v2/vendor/products/:id/submit
GET   /api/v2/vendor/inventory
PUT   /api/v2/vendor/inventory/:variantId
POST  /api/v2/admin/catalog/products/:id/moderate
```

Firebase authentication is required. Vendor operations use active membership and scoped staff permissions. Moderation requires `admin:manage`; vendor roles cannot moderate their own products. Draft updates and inventory adjustments use optimistic versions. Inventory mutations append movement records and use an idempotency key.

## Local Data

Run the existing migration and refreshed seed:

```text
npm run prisma:migrate:deploy
npm run prisma:seed
npm run dev
```

The seed now replaces legacy dotted permission keys with the canonical colon-separated domain permissions. Rerun it in every non-production environment after deploying Phase 4.

Set `OBJECT_STORAGE_PUBLIC_URL` when media storage keys must be expanded into public URLs. Fully qualified seed URLs are passed through unchanged. Production private media must use signed access rather than this public base.

## Gate Status

- Bounded contract pagination and keyset page non-overlap tests pass.
- PostgreSQL rejects negative inventory and duplicate SKUs.
- Moderation role tests confirm operations access and vendor denial.
- Critical mobile discovery controls include button, heading, image, and search accessibility semantics.
- Strict type-check, complete test suite, OpenAPI generation, secret scan, Prisma validation, and Expo web export pass.

Production load testing still requires staging with production-sized catalog data and object-storage/CDN configuration.
