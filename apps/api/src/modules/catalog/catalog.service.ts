import { Prisma, type PrismaClient } from "@prisma/client";
import { authorize, type Permission, type Role } from "@amiyo/domain";
import type { ArchiveProduct, BulkProductCsvInput, CatalogQuery, CreateProductInput, InventoryAdjustmentInput, ModerationInput, ReplaceProductMedia, ReplaceProductVariants, Session, UpdateProductInput } from "@amiyo/contracts";
import { withSerializableTransaction, type TransactionClient } from "../../infrastructure/database/transaction.js";
import { ApiProblem } from "../../middleware/api-problem.js";
import { CatalogRepository, publicProductInclude, type PublicProduct } from "./catalog.repository.js";
import { parseProductCsv, serializeProductCsv } from "./product-csv.js";

function mediaUrl(storageKey: string | null) {
  if (!storageKey) return null;
  if (/^https?:\/\//.test(storageKey)) return storageKey;
  const base = process.env.OBJECT_STORAGE_PUBLIC_URL?.replace(/\/$/, "");
  return base ? `${base}/${storageKey.replace(/^\//, "")}` : null;
}

function productSummary(product: PublicProduct) {
  const variant = product.variants[0];
  return {
    id: product.id,
    vendorId: product.vendorId,
    shopId: product.shopId,
    shopName: product.shop.name,
    shopSlug: product.shop.slug,
    categoryId: product.categoryId,
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    status: product.status,
    thumbnailUrl: mediaUrl(product.media[0]?.storageKey ?? null),
    minimumPrice: { amountMinor: (variant?.priceMinor ?? 0n).toString(), currency: variant?.currency ?? "BDT" },
    rating: 0,
    reviewCount: product._count.reviews,
    version: product.version,
    publishedAt: product.publishedAt?.toISOString() ?? null
  };
}

function productDetail(product: PublicProduct) {
  return {
    ...productSummary(product),
    description: product.description,
    dynamicAttributes: product.dynamicAttributes as Record<string, unknown> | null,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      title: variant.title,
      attributes: variant.attributes as Record<string, unknown> | null,
      price: { amountMinor: variant.priceMinor.toString(), currency: variant.currency },
      compareAtPrice: variant.compareAtMinor === null ? null : { amountMinor: variant.compareAtMinor.toString(), currency: variant.currency },
      availableQuantity: Math.max(0, (variant.inventory?.onHand ?? 0) - (variant.inventory?.reserved ?? 0)),
      active: variant.active,
      version: variant.version
    })),
    media: product.media.flatMap((item) => {
      const url = mediaUrl(item.storageKey);
      return url ? [{ id: item.id, url, mediaType: item.mediaType, mimeType: item.mimeType, variantId: item.variantId, altText: item.altText, displayOrder: item.displayOrder }] : [];
    })
  };
}

function inventoryDto(item: { id: string; variantId: string; onHand: number; reserved: number; reorderLevel: number; version: number; updatedAt: Date }, variant: { productId: string; sku: string; product: { name: string } }) {
  return { id: item.id, variantId: item.variantId, productId: variant.productId, productName: variant.product.name, sku: variant.sku, onHand: item.onHand, reserved: item.reserved, available: Math.max(0, item.onHand - item.reserved), reorderLevel: item.reorderLevel, version: item.version, updatedAt: item.updatedAt.toISOString() };
}

function authorizationContext(session: Session) {
  return {
    userId: session.principal.userId,
    status: session.status,
    roles: session.principal.roles as Role[],
    vendorMemberships: session.vendorMemberships.map((membership) => ({ ...membership, status: "active" }))
  };
}

function requireAuthorization(session: Session, permission: Permission, vendorId?: string) {
  if (!authorize(authorizationContext(session), { permission, ...(vendorId ? { vendorId } : {}) })) {
    throw new ApiProblem(403, "INSUFFICIENT_PERMISSION", "You do not have permission for this catalog operation");
  }
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function audit(transaction: TransactionClient, input: { actorUserId: string; action: string; resourceId: string; correlationId?: string; before?: unknown; after?: unknown }) {
  await transaction.auditLog.create({ data: {
    actorUserId: input.actorUserId,
    actorType: "user",
    action: input.action,
    resourceType: "product",
    resourceId: input.resourceId,
    ...(input.correlationId ? { correlationId: input.correlationId } : {}),
    ...(input.before === undefined ? {} : { before: json(input.before) }),
    ...(input.after === undefined ? {} : { after: json(input.after) })
  } });
}

export class CatalogService {
  private readonly repository: CatalogRepository;
  constructor(private readonly client: PrismaClient) { this.repository = new CatalogRepository(client); }

  async categories() {
    const rows = await this.repository.listCategories();
    return rows.map((row) => ({ id: row.id, parentId: row.parentId, name: row.name, slug: row.slug, description: row.description, displayOrder: row.displayOrder, version: row.version }));
  }

  async products(input: CatalogQuery) {
    const result = await this.repository.listPublishedProducts(input);
    return { data: result.data.map(productSummary), pageInfo: result.pageInfo };
  }

  async product(identifier: string) {
    const row = await this.repository.getPublishedProduct(identifier);
    if (!row) throw new ApiProblem(404, "PRODUCT_NOT_FOUND", "Product not found");
    return productDetail(row);
  }

  async shops(cursor: string | undefined, limit: number) {
    const result = await this.repository.listShops(cursor, limit);
    return { data: result.data.map((shop) => ({ id: shop.id, vendorId: shop.vendorId, name: shop.name, slug: shop.slug, description: shop.description, logoUrl: mediaUrl(shop.logoStorageKey), bannerUrl: mediaUrl(shop.bannerStorageKey), productCount: shop._count.products, version: shop.version })), pageInfo: result.pageInfo };
  }

  async shop(identifier: string, query: CatalogQuery) {
    const shop = await this.repository.getShop(identifier);
    if (!shop) throw new ApiProblem(404, "SHOP_NOT_FOUND", "Shop not found");
    const products = await this.products({ ...query, shop: shop.id });
    return { id: shop.id, vendorId: shop.vendorId, name: shop.name, slug: shop.slug, description: shop.description, logoUrl: mediaUrl(shop.logoStorageKey), bannerUrl: mediaUrl(shop.bannerStorageKey), productCount: shop._count.products, version: shop.version, products };
  }

  async createProduct(session: Session, input: CreateProductInput, correlationId?: string) {
    const shop = await this.client.vendorShop.findUnique({ where: { id: input.shopId } });
    if (!shop) throw new ApiProblem(404, "SHOP_NOT_FOUND", "Shop not found");
    requireAuthorization(session, "products:manage", shop.vendorId);
    return withSerializableTransaction(this.client, async (transaction) => {
      const product = await transaction.product.create({ data: {
        vendorId: shop.vendorId,
        shopId: input.shopId,
        categoryId: input.categoryId,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        brand: input.brand ?? null,
        dynamicAttributes: input.dynamicAttributes === undefined ? Prisma.JsonNull : json(input.dynamicAttributes),
        variants: { create: input.variants.map((variant) => ({
          sku: variant.sku,
          title: variant.title,
          attributes: variant.attributes === undefined ? Prisma.JsonNull : json(variant.attributes),
          priceMinor: BigInt(variant.priceMinor),
          compareAtMinor: variant.compareAtMinor ? BigInt(variant.compareAtMinor) : null,
          currency: variant.currency,
          inventory: { create: { onHand: variant.onHand } }
        })) }
      } });
      await audit(transaction, { actorUserId: session.principal.userId, action: "catalog.product.created", resourceId: product.id, ...(correlationId ? { correlationId } : {}), after: { status: product.status, version: product.version } });
      const created = await transaction.product.findUniqueOrThrow({ where: { id: product.id }, include: publicProductInclude });
      return productDetail(created);
    });
  }

  async vendorProducts(session: Session, vendorId?: string) {
    const resolvedVendorId = vendorId ?? session.vendorMemberships[0]?.vendorId;
    if (!resolvedVendorId) throw new ApiProblem(400, "VENDOR_SCOPE_REQUIRED", "A vendor scope is required");
    requireAuthorization(session, "products:manage", resolvedVendorId);
    const rows = await this.client.product.findMany({ where: { vendorId: resolvedVendorId }, orderBy: { updatedAt: "desc" }, include: publicProductInclude });
    return rows.map(productDetail);
  }

  async importProducts(session: Session, input: BulkProductCsvInput, correlationId?: string) {
    const products = parseProductCsv(input); const shop = await this.client.vendorShop.findUnique({ where: { id: input.shopId } }); if (!shop) throw new ApiProblem(404, "SHOP_NOT_FOUND", "Shop not found"); requireAuthorization(session, "products:manage", shop.vendorId); const category = await this.client.category.findUnique({ where: { id: input.categoryId } }); if (!category) throw new ApiProblem(404, "CATEGORY_NOT_FOUND", "Category not found"); const slugs = products.map((product) => product.slug); const skus = products.flatMap((product) => product.variants.map((variant) => variant.sku)); const [existingProduct, existingVariant] = await Promise.all([this.client.product.findFirst({ where: { slug: { in: slugs } }, select: { slug: true } }), this.client.productVariant.findFirst({ where: { sku: { in: skus } }, select: { sku: true } })]); if (existingProduct) throw new ApiProblem(409, "PRODUCT_SLUG_EXISTS", `Product slug '${existingProduct.slug}' already exists`); if (existingVariant) throw new ApiProblem(409, "PRODUCT_SKU_EXISTS", `SKU '${existingVariant.sku}' already exists`);
    return withSerializableTransaction(this.client, async (transaction) => { const created: Array<{ id: string; name: string; slug: string; sku: string }> = []; for (const inputProduct of products) { const product = await transaction.product.create({ data: { vendorId: shop.vendorId, shopId: input.shopId, categoryId: input.categoryId, name: inputProduct.name, slug: inputProduct.slug, description: inputProduct.description ?? null, brand: inputProduct.brand ?? null, dynamicAttributes: inputProduct.dynamicAttributes === undefined ? Prisma.JsonNull : json(inputProduct.dynamicAttributes), variants: { create: inputProduct.variants.map((variant) => ({ sku: variant.sku, title: variant.title, attributes: variant.attributes === undefined ? Prisma.JsonNull : json(variant.attributes), priceMinor: BigInt(variant.priceMinor), compareAtMinor: variant.compareAtMinor ? BigInt(variant.compareAtMinor) : null, currency: variant.currency, inventory: { create: { onHand: variant.onHand } } })) } } }); created.push({ id: product.id, name: product.name, slug: product.slug, sku: inputProduct.variants[0]!.sku }); } await audit(transaction, { actorUserId: session.principal.userId, action: "catalog.products.bulk_imported", resourceId: shop.vendorId, ...(correlationId ? { correlationId } : {}), after: { count: created.length, productIds: created.map((product) => product.id) } }); return { created: created.length, products: created }; });
  }

  async exportProducts(session: Session, vendorId?: string) { const resolvedVendorId = vendorId ?? session.vendorMemberships[0]?.vendorId; if (!resolvedVendorId) throw new ApiProblem(400, "VENDOR_SCOPE_REQUIRED", "A vendor scope is required"); requireAuthorization(session, "products:manage", resolvedVendorId); const products = await this.client.product.findMany({ where: { vendorId: resolvedVendorId }, orderBy: { createdAt: "asc" }, include: { variants: { orderBy: { createdAt: "asc" }, include: { inventory: true } } } }); return serializeProductCsv(products); }

  async vendorInventory(session: Session, vendorId?: string) {
    const resolvedVendorId = vendorId ?? session.vendorMemberships[0]?.vendorId;
    if (!resolvedVendorId) throw new ApiProblem(400, "VENDOR_SCOPE_REQUIRED", "A vendor scope is required");
    requireAuthorization(session, "inventory:manage", resolvedVendorId);
    const rows = await this.client.inventoryItem.findMany({ where: { variant: { product: { vendorId: resolvedVendorId } } }, orderBy: { updatedAt: "desc" }, include: { variant: { include: { product: true } } } });
    return rows.map((item) => inventoryDto(item, item.variant));
  }

  async updateProduct(session: Session, productId: string, input: UpdateProductInput, correlationId?: string) {
    const before = await this.client.product.findUnique({ where: { id: productId } });
    if (!before) throw new ApiProblem(404, "PRODUCT_NOT_FOUND", "Product not found");
    requireAuthorization(session, "products:manage", before.vendorId);
    if (!(["DRAFT", "REJECTED"] as const).includes(before.status as "DRAFT" | "REJECTED")) throw new ApiProblem(409, "PRODUCT_NOT_EDITABLE", "Only draft or rejected products can be edited");
    return withSerializableTransaction(this.client, async (transaction) => {
      const data: Prisma.ProductUncheckedUpdateManyInput = { version: { increment: 1 } };
      if (input.name !== undefined) data.name = input.name;
      if (input.description !== undefined) data.description = input.description;
      if (input.brand !== undefined) data.brand = input.brand;
      if (input.categoryId !== undefined) data.categoryId = input.categoryId;
      if (input.dynamicAttributes !== undefined) data.dynamicAttributes = input.dynamicAttributes === null ? Prisma.JsonNull : json(input.dynamicAttributes);
      const result = await transaction.product.updateMany({ where: { id: productId, version: input.version }, data });
      if (result.count !== 1) throw new ApiProblem(409, "VERSION_CONFLICT", "The product was changed by another request");
      const after = await transaction.product.findUniqueOrThrow({ where: { id: productId } });
      await audit(transaction, { actorUserId: session.principal.userId, action: "catalog.product.updated", resourceId: productId, ...(correlationId ? { correlationId } : {}), before, after });
      return after;
    });
  }

  async replaceVariants(session: Session, productId: string, input: ReplaceProductVariants, correlationId?: string) {
    const before = await this.client.product.findUnique({ where: { id: productId }, include: { variants: { include: { inventory: true } } } });
    if (!before) throw new ApiProblem(404, "PRODUCT_NOT_FOUND", "Product not found");
    requireAuthorization(session, "products:manage", before.vendorId);
    if (!("DRAFT" === before.status || "REJECTED" === before.status)) throw new ApiProblem(409, "PRODUCT_NOT_EDITABLE", "Only draft or rejected products can be edited");
    const existingIds = new Set(before.variants.map((variant) => variant.id));
    const requestedIds = input.variants.flatMap((variant) => variant.id ? [variant.id] : []);
    if (requestedIds.some((id) => !existingIds.has(id))) throw new ApiProblem(400, "VARIANT_NOT_OWNED", "A variant does not belong to this product");
    const conflicting = await this.client.productVariant.findFirst({ where: { sku: { in: input.variants.map((variant) => variant.sku) }, id: { notIn: requestedIds.length ? requestedIds : ["00000000-0000-0000-0000-000000000000"] } }, select: { sku: true } });
    if (conflicting) throw new ApiProblem(409, "PRODUCT_SKU_EXISTS", `SKU '${conflicting.sku}' already exists`);
    return withSerializableTransaction(this.client, async (transaction) => {
      const changed = await transaction.product.updateMany({ where: { id: productId, version: input.version }, data: { version: { increment: 1 } } });
      if (changed.count !== 1) throw new ApiProblem(409, "VERSION_CONFLICT", "The product was changed by another request");
      const retained = new Set(requestedIds);
      await transaction.productVariant.updateMany({ where: { productId, id: { notIn: [...retained] } }, data: { active: false, version: { increment: 1 } } });
      for (const variant of input.variants) {
        if (variant.id) {
          const prior = before.variants.find((item) => item.id === variant.id)!;
          if ((prior.inventory?.reserved ?? 0) > variant.onHand) throw new ApiProblem(409, "STOCK_BELOW_RESERVED", `SKU '${variant.sku}' has reserved stock`);
          await transaction.productVariant.update({ where: { id: variant.id }, data: { sku: variant.sku, title: variant.title, attributes: variant.attributes === undefined ? Prisma.JsonNull : json(variant.attributes), priceMinor: BigInt(variant.priceMinor), compareAtMinor: variant.compareAtMinor ? BigInt(variant.compareAtMinor) : null, currency: variant.currency, active: variant.active, version: { increment: 1 } } });
          const inventory = prior.inventory;
          if (inventory && inventory.onHand !== variant.onHand) {
            await transaction.inventoryItem.update({ where: { id: inventory.id }, data: { onHand: variant.onHand, version: { increment: 1 } } });
            await transaction.inventoryMovement.create({ data: { inventoryId: inventory.id, type: "ADJUSTMENT", quantity: variant.onHand - inventory.onHand, referenceType: "product_variant_edit", referenceId: productId, idempotencyKey: `variant-edit:${productId}:${input.version}:${variant.id}`, metadata: { reason: "Seller product variant update" } } });
          }
        } else {
          await transaction.productVariant.create({ data: { productId, sku: variant.sku, title: variant.title, attributes: variant.attributes === undefined ? Prisma.JsonNull : json(variant.attributes), priceMinor: BigInt(variant.priceMinor), compareAtMinor: variant.compareAtMinor ? BigInt(variant.compareAtMinor) : null, currency: variant.currency, active: variant.active, inventory: { create: { onHand: variant.onHand } } } });
        }
      }
      await audit(transaction, { actorUserId: session.principal.userId, action: "catalog.product_variants.replaced", resourceId: productId, ...(correlationId ? { correlationId } : {}), before: { variantIds: before.variants.map((item) => item.id) }, after: { variantCount: input.variants.length } });
      return productDetail(await transaction.product.findUniqueOrThrow({ where: { id: productId }, include: publicProductInclude }));
    });
  }

  async replaceMedia(session: Session, productId: string, input: ReplaceProductMedia, correlationId?: string) {
    const before = await this.client.product.findUnique({ where: { id: productId }, include: { media: true, variants: true } });
    if (!before) throw new ApiProblem(404, "PRODUCT_NOT_FOUND", "Product not found");
    requireAuthorization(session, "products:manage", before.vendorId);
    if (!("DRAFT" === before.status || "REJECTED" === before.status)) throw new ApiProblem(409, "PRODUCT_NOT_EDITABLE", "Only draft or rejected products can be edited");
    const mediaIds = input.items.flatMap((item) => item.id ? [item.id] : []);
    const uploadIds = input.items.flatMap((item) => item.uploadId ? [item.uploadId] : []);
    if (mediaIds.some((id) => !before.media.some((item) => item.id === id))) throw new ApiProblem(400, "MEDIA_NOT_OWNED", "Existing media does not belong to this product");
    const variantIds = new Set(before.variants.map((variant) => variant.id));
    if (input.items.some((item) => item.variantId && !variantIds.has(item.variantId))) throw new ApiProblem(400, "VARIANT_NOT_OWNED", "Media variant does not belong to this product");
    const uploads = uploadIds.length ? await this.client.mediaUpload.findMany({ where: { id: { in: uploadIds }, userId: session.principal.userId, purpose: "product", status: { in: ["uploaded", "processing", "ready"] } } }) : [];
    if (uploads.length !== uploadIds.length) throw new ApiProblem(409, "MEDIA_UPLOAD_NOT_READY", "Complete every product image upload before saving");
    const uploadById = new Map(uploads.map((upload) => [upload.id, upload]));
    return withSerializableTransaction(this.client, async (transaction) => {
      const changed = await transaction.product.updateMany({ where: { id: productId, version: input.version }, data: { version: { increment: 1 } } });
      if (changed.count !== 1) throw new ApiProblem(409, "VERSION_CONFLICT", "The product was changed by another request");
      await transaction.productMedia.deleteMany({ where: { productId, id: { notIn: mediaIds.length ? mediaIds : ["00000000-0000-0000-0000-000000000000"] } } });
      for (const item of input.items) {
        if (item.id) await transaction.productMedia.update({ where: { id: item.id }, data: { variantId: item.variantId ?? null, altText: item.altText ?? null, displayOrder: item.displayOrder } });
        else {
          const upload = uploadById.get(item.uploadId!)!;
          await transaction.productMedia.create({ data: { productId, variantId: item.variantId ?? null, storageKey: upload.storageKey, mediaType: "image", mimeType: upload.mimeType, altText: item.altText ?? null, displayOrder: item.displayOrder } });
        }
      }
      await audit(transaction, { actorUserId: session.principal.userId, action: "catalog.product_media.replaced", resourceId: productId, ...(correlationId ? { correlationId } : {}), before: { mediaIds: before.media.map((item) => item.id) }, after: { mediaCount: input.items.length } });
      return productDetail(await transaction.product.findUniqueOrThrow({ where: { id: productId }, include: publicProductInclude }));
    });
  }

  async archiveProduct(session: Session, productId: string, input: ArchiveProduct, correlationId?: string) {
    const before = await this.client.product.findUnique({ where: { id: productId } });
    if (!before) throw new ApiProblem(404, "PRODUCT_NOT_FOUND", "Product not found");
    requireAuthorization(session, "products:manage", before.vendorId);
    if (before.status === "SUBMITTED") throw new ApiProblem(409, "PRODUCT_REVIEW_IN_PROGRESS", "A product under review cannot be archived");
    if (before.status === "ARCHIVED") throw new ApiProblem(409, "PRODUCT_ALREADY_ARCHIVED", "Product is already archived");
    return withSerializableTransaction(this.client, async (transaction) => {
      const changed = await transaction.product.updateMany({ where: { id: productId, version: input.version }, data: { status: "ARCHIVED", publishedAt: null, version: { increment: 1 } } });
      if (changed.count !== 1) throw new ApiProblem(409, "VERSION_CONFLICT", "The product was changed by another request");
      await transaction.productVariant.updateMany({ where: { productId }, data: { active: false, version: { increment: 1 } } });
      const after = await transaction.product.findUniqueOrThrow({ where: { id: productId }, include: publicProductInclude });
      await audit(transaction, { actorUserId: session.principal.userId, action: "catalog.product.archived", resourceId: productId, ...(correlationId ? { correlationId } : {}), before: { status: before.status, version: before.version }, after: { status: after.status, version: after.version, reason: input.reason } });
      return productDetail(after);
    });
  }

  async submitProduct(session: Session, productId: string, correlationId?: string) {
    const before = await this.client.product.findUnique({ where: { id: productId } });
    if (!before) throw new ApiProblem(404, "PRODUCT_NOT_FOUND", "Product not found");
    requireAuthorization(session, "products:manage", before.vendorId);
    if (before.status !== "DRAFT" && before.status !== "REJECTED") throw new ApiProblem(409, "PRODUCT_NOT_SUBMITTABLE", "Product cannot be submitted from its current status");
    return withSerializableTransaction(this.client, async (transaction) => {
      const after = await transaction.product.update({ where: { id: productId }, data: { status: "SUBMITTED", version: { increment: 1 } } });
      await transaction.productModerationEvent.create({ data: { productId, fromStatus: before.status, toStatus: "SUBMITTED", actorUserId: session.principal.userId } });
      await audit(transaction, { actorUserId: session.principal.userId, action: "catalog.product.submitted", resourceId: productId, ...(correlationId ? { correlationId } : {}), before: { status: before.status }, after: { status: after.status } });
      return after;
    });
  }

  async adjustInventory(session: Session, variantId: string, input: InventoryAdjustmentInput, correlationId?: string) {
    const variant = await this.client.productVariant.findUnique({ where: { id: variantId }, include: { product: true, inventory: true } });
    if (!variant?.inventory) throw new ApiProblem(404, "INVENTORY_NOT_FOUND", "Inventory not found");
    const inventory = variant.inventory;
    requireAuthorization(session, "inventory:manage", variant.product.vendorId);
    return withSerializableTransaction(this.client, async (transaction) => {
      const existing = await transaction.inventoryMovement.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (existing) return inventoryDto(await transaction.inventoryItem.findUniqueOrThrow({ where: { id: inventory.id } }), variant);
      const quantity = input.onHand - inventory.onHand;
      const result = await transaction.inventoryItem.updateMany({ where: { id: inventory.id, version: input.version }, data: { onHand: input.onHand, version: { increment: 1 } } });
      if (result.count !== 1) throw new ApiProblem(409, "VERSION_CONFLICT", "Inventory was changed by another request");
      if (quantity !== 0) await transaction.inventoryMovement.create({ data: { inventoryId: inventory.id, type: "ADJUSTMENT", quantity, referenceType: "manual_adjustment", referenceId: variantId, idempotencyKey: input.idempotencyKey, metadata: { reason: input.reason } } });
      const after = await transaction.inventoryItem.findUniqueOrThrow({ where: { id: inventory.id } });
      await audit(transaction, { actorUserId: session.principal.userId, action: "catalog.inventory.adjusted", resourceId: variant.productId, ...(correlationId ? { correlationId } : {}), before: inventory, after });
      return inventoryDto(after, variant);
    });
  }

  async moderate(session: Session, productId: string, input: ModerationInput, correlationId?: string) {
    requireAuthorization(session, "admin:manage");
    const before = await this.client.product.findUnique({ where: { id: productId } });
    if (!before) throw new ApiProblem(404, "PRODUCT_NOT_FOUND", "Product not found");
    if (before.status !== "SUBMITTED") throw new ApiProblem(409, "PRODUCT_NOT_REVIEWABLE", "Only submitted products can be moderated");
    return withSerializableTransaction(this.client, async (transaction) => {
      const after = await transaction.product.update({ where: { id: productId }, data: { status: input.status, publishedAt: input.status === "APPROVED" ? new Date() : null, version: { increment: 1 } } });
      await transaction.productModerationEvent.create({ data: { productId, fromStatus: before.status, toStatus: input.status, actorUserId: session.principal.userId, reason: input.reason } });
      await audit(transaction, { actorUserId: session.principal.userId, action: `catalog.product.${input.status.toLowerCase()}`, resourceId: productId, ...(correlationId ? { correlationId } : {}), before: { status: before.status }, after: { status: after.status, reason: input.reason } });
      return after;
    });
  }

  async adminProducts(session: Session) {
    requireAuthorization(session, "admin:read");
    const rows = await this.client.product.findMany({ orderBy: { updatedAt: "desc" }, include: publicProductInclude, take: 300 });
    return rows.map(productDetail);
  }
  async adminUpdateProduct(session: Session, productId: string, input: UpdateProductInput, correlationId?: string) {
    requireAuthorization(session, "admin:manage");
    const before = await this.client.product.findUnique({ where: { id: productId } });
    if (!before) throw new ApiProblem(404, "PRODUCT_NOT_FOUND", "Product not found");
    return withSerializableTransaction(this.client, async (transaction) => {
      const data: Prisma.ProductUncheckedUpdateManyInput = { version: { increment: 1 } };
      if (input.name !== undefined) data.name = input.name;
      if (input.description !== undefined) data.description = input.description;
      if (input.brand !== undefined) data.brand = input.brand;
      if (input.categoryId !== undefined) data.categoryId = input.categoryId;
      if (input.dynamicAttributes !== undefined) data.dynamicAttributes = input.dynamicAttributes === null ? Prisma.JsonNull : json(input.dynamicAttributes);
      const result = await transaction.product.updateMany({ where: { id: productId, version: input.version }, data });
      if (result.count !== 1) throw new ApiProblem(409, "VERSION_CONFLICT", "The product was changed by another request");
      const after = await transaction.product.findUniqueOrThrow({ where: { id: productId }, include: publicProductInclude });
      await audit(transaction, { actorUserId: session.principal.userId, action: "catalog.product.admin_updated", resourceId: productId, ...(correlationId ? { correlationId } : {}), before, after });
      return productDetail(after);
    });
  }
  async setAdminProductStatus(session: Session, productId: string, input: { status: "APPROVED" | "ARCHIVED"; reason: string }, correlationId?: string) {
    requireAuthorization(session, "admin:manage"); const before = await this.client.product.findUnique({ where: { id: productId } }); if (!before) throw new ApiProblem(404, "PRODUCT_NOT_FOUND", "Product not found");
    const after = await this.client.product.update({ where: { id: productId }, data: { status: input.status, publishedAt: input.status === "APPROVED" ? before.publishedAt ?? new Date() : null, version: { increment: 1 } } });
    await this.client.productModerationEvent.create({ data: { productId, fromStatus: before.status, toStatus: input.status, actorUserId: session.principal.userId, reason: input.reason } });
    await this.client.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: `catalog.product.${input.status.toLowerCase()}`, resourceType: "product", resourceId: productId, ...(correlationId ? { correlationId } : {}), before: json({ status: before.status }), after: json(input) } });
    return after;
  }
}
