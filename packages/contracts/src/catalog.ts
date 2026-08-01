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
    altText: z.string().nullable(),
    displayOrder: z.number().int()
  }))
});

export const productListResponseSchema = paginatedResponseSchema(productSummarySchema);

export type CategoryDto = z.infer<typeof categorySchema>;
export type ProductSummaryDto = z.infer<typeof productSummarySchema>;
export type ProductDetailDto = z.infer<typeof productDetailSchema>;
