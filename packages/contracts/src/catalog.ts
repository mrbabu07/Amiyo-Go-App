import { z } from "zod";
import { moneySchema, timestampSchema, uuidSchema, versionSchema } from "./common.js";
import { paginatedResponseSchema } from "./pagination.js";

export const productStatusSchema = z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "ARCHIVED"]);

export const categorySchema = z.object({
  id: uuidSchema,
  parentId: uuidSchema.nullable(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable(),
  displayOrder: z.number().int(),
  version: versionSchema
});

export const productVariantSchema = z.object({
  id: uuidSchema,
  sku: z.string().min(1),
  title: z.string().min(1),
  attributes: z.record(z.unknown()).nullable(),
  price: moneySchema,
  compareAtPrice: moneySchema.nullable(),
  availableQuantity: z.number().int().nonnegative(),
  active: z.boolean(),
  version: versionSchema
});

export const productSummarySchema = z.object({
  id: uuidSchema,
  vendorId: uuidSchema,
  shopId: uuidSchema,
  shopName: z.string(),
  shopSlug: z.string(),
  categoryId: uuidSchema,
  name: z.string().min(1),
  slug: z.string().min(1),
  brand: z.string().nullable(),
  status: productStatusSchema,
  thumbnailUrl: z.string().url().nullable(),
  minimumPrice: moneySchema,
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  version: versionSchema,
  publishedAt: timestampSchema.nullable()
});

export const productDetailSchema = productSummarySchema.extend({
  description: z.string().nullable(),
  dynamicAttributes: z.record(z.unknown()).nullable(),
  variants: z.array(productVariantSchema),
  media: z.array(z.object({
    id: uuidSchema,
    url: z.string().url(),
    mediaType: z.string(),
    mimeType: z.string(),
    variantId: uuidSchema.nullable(),
    altText: z.string().nullable(),
    displayOrder: z.number().int()
  }))
});

export const productListResponseSchema = paginatedResponseSchema(productSummarySchema);

export const catalogQuerySchema = z.object({
  cursor: uuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  query: z.string().trim().max(120).optional(),
  category: z.string().trim().max(100).optional(),
  shop: z.string().trim().max(100).optional(),
  sort: z.literal("newest").default("newest")
});

export const shopSummarySchema = z.object({
  id: uuidSchema,
  vendorId: uuidSchema,
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  logoUrl: z.string().url().nullable(),
  bannerUrl: z.string().url().nullable(),
  productCount: z.number().int().nonnegative(),
  version: versionSchema
});

export const shopDetailSchema = shopSummarySchema.extend({
  products: productListResponseSchema
});
export const shopListResponseSchema = paginatedResponseSchema(shopSummarySchema);

export const productVariantInputSchema = z.object({
  sku: z.string().trim().min(3).max(80),
  title: z.string().trim().min(1).max(120),
  attributes: z.record(z.unknown()).nullable().optional(),
  priceMinor: z.string().regex(/^\d+$/),
  compareAtMinor: z.string().regex(/^\d+$/).nullable().optional(),
  currency: z.string().length(3).transform((value) => value.toUpperCase()).default("BDT"),
  onHand: z.number().int().nonnegative().default(0)
});

export const createProductSchema = z.object({
  shopId: uuidSchema,
  categoryId: uuidSchema,
  name: z.string().trim().min(3).max(180),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(200),
  description: z.string().trim().max(10_000).nullable().optional(),
  brand: z.string().trim().max(120).nullable().optional(),
  dynamicAttributes: z.record(z.unknown()).nullable().optional(),
  variants: z.array(productVariantInputSchema).min(1).max(100)
});

export const bulkProductCsvInputSchema = z.object({ shopId: uuidSchema, categoryId: uuidSchema, csv: z.string().min(1).max(2_000_000) });
export const bulkProductImportResultSchema = z.object({ created: z.number().int().positive(), products: z.array(z.object({ id: uuidSchema, name: z.string(), slug: z.string(), sku: z.string() })) });

export const updateProductSchema = z.object({
  version: versionSchema,
  name: z.string().trim().min(3).max(180).optional(),
  description: z.string().trim().max(10_000).nullable().optional(),
  brand: z.string().trim().max(120).nullable().optional(),
  categoryId: uuidSchema.optional(),
  dynamicAttributes: z.record(z.unknown()).nullable().optional()
}).refine((value) => Object.keys(value).length > 1, "At least one product field is required");

export const replaceProductVariantsSchema = z.object({
  version: versionSchema,
  variants: z.array(productVariantInputSchema.extend({
    id: uuidSchema.optional(),
    active: z.boolean().default(true)
  })).min(1).max(100)
}).superRefine((value, context) => {
  const ids = value.variants.flatMap((variant) => variant.id ? [variant.id] : []);
  const skus = value.variants.map((variant) => variant.sku.toUpperCase());
  if (new Set(ids).size !== ids.length) context.addIssue({ code: "custom", message: "Variant IDs must be unique", path: ["variants"] });
  if (new Set(skus).size !== skus.length) context.addIssue({ code: "custom", message: "Variant SKUs must be unique", path: ["variants"] });
});

export const replaceProductMediaSchema = z.object({
  version: versionSchema,
  items: z.array(z.object({
    id: uuidSchema.optional(),
    uploadId: uuidSchema.optional(),
    variantId: uuidSchema.nullable().optional(),
    altText: z.string().trim().max(180).nullable().optional(),
    displayOrder: z.number().int().min(0).max(100)
  }).refine((item) => Boolean(item.id) !== Boolean(item.uploadId), "Provide either an existing media ID or a new upload ID")).max(12)
}).superRefine((value, context) => {
  const references = value.items.map((item) => item.id ?? item.uploadId!);
  if (new Set(references).size !== references.length) context.addIssue({ code: "custom", message: "Media references must be unique", path: ["items"] });
});

export const inventoryAdjustmentSchema = z.object({
  version: versionSchema,
  onHand: z.number().int().nonnegative(),
  idempotencyKey: z.string().uuid(),
  reason: z.string().trim().min(3).max(240)
});

export const vendorInventorySchema = z.object({
  id: uuidSchema,
  variantId: uuidSchema,
  productId: uuidSchema,
  productName: z.string(),
  sku: z.string(),
  onHand: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative(),
  available: z.number().int().nonnegative(),
  reorderLevel: z.number().int().nonnegative(),
  version: versionSchema,
  updatedAt: timestampSchema
});

export const moderationInputSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().trim().min(3).max(500)
});

export type CategoryDto = z.infer<typeof categorySchema>;
export type ProductSummaryDto = z.infer<typeof productSummarySchema>;
export type ProductDetailDto = z.infer<typeof productDetailSchema>;
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
export type ShopSummaryDto = z.infer<typeof shopSummarySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type BulkProductCsvInput = z.infer<typeof bulkProductCsvInputSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ReplaceProductVariants = z.infer<typeof replaceProductVariantsSchema>;
export type ReplaceProductMedia = z.infer<typeof replaceProductMediaSchema>;
export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;
export type ModerationInput = z.infer<typeof moderationInputSchema>;
