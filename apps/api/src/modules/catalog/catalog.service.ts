import { Prisma, type PrismaClient } from "@prisma/client";
import { authorize, type Permission, type Role } from "@amiyo/domain";
import type { CatalogQuery, CreateProductInput, InventoryAdjustmentInput, ModerationInput, Session, UpdateProductInput } from "@amiyo/contracts";
import { withSerializableTransaction, type TransactionClient } from "../../infrastructure/database/transaction.js";
import { ApiProblem } from "../../middleware/api-problem.js";
import { CatalogRepository, publicProductInclude, type PublicProduct } from "./catalog.repository.js";

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
      return url ? [{ id: item.id, url, mediaType: item.mediaType, altText: item.altText, displayOrder: item.displayOrder }] : [];
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
      return product;
    });
  }

  async vendorProducts(session: Session, vendorId?: string) {
    const resolvedVendorId = vendorId ?? session.vendorMemberships[0]?.vendorId;
    if (!resolvedVendorId) throw new ApiProblem(400, "VENDOR_SCOPE_REQUIRED", "A vendor scope is required");
    requireAuthorization(session, "products:manage", resolvedVendorId);
    const rows = await this.client.product.findMany({ where: { vendorId: resolvedVendorId }, orderBy: { updatedAt: "desc" }, include: publicProductInclude });
    return rows.map(productDetail);
  }

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
}
