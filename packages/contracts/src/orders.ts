import { z } from "zod";
import { moneySchema, timestampSchema, uuidSchema, versionSchema } from "./common.js";
import { paginatedResponseSchema } from "./pagination.js";

export const parentOrderStatusSchema = z.enum([
  "PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERED", "CANCELLED", "RETURN_REQUESTED", "RETURNED", "REFUNDED"
]);

export const vendorOrderStatusSchema = z.enum([
  "PLACED", "ACCEPTED", "REJECTED", "PROCESSING", "READY_TO_SHIP", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "CANCELLED"
]);

export const orderItemSchema = z.object({
  id: uuidSchema,
  productId: uuidSchema,
  variantId: uuidSchema,
  productName: z.string(),
  sku: z.string(),
  attributes: z.record(z.unknown()).nullable(),
  quantity: z.number().int().positive(),
  unitPrice: moneySchema,
  discount: moneySchema,
  lineTotal: moneySchema
});

export const vendorOrderSchema = z.object({
  id: uuidSchema,
  vendorId: uuidSchema,
  shopId: uuidSchema,
  status: vendorOrderStatusSchema,
  subtotal: moneySchema,
  discount: moneySchema,
  delivery: moneySchema,
  total: moneySchema,
  commission: moneySchema,
  version: versionSchema,
  items: z.array(orderItemSchema)
});

export const orderSchema = z.object({
  id: uuidSchema,
  orderNumber: z.string().min(1),
  status: parentOrderStatusSchema,
  subtotal: moneySchema,
  discount: moneySchema,
  delivery: moneySchema,
  tax: moneySchema,
  total: moneySchema,
  version: versionSchema,
  createdAt: timestampSchema,
  vendorOrders: z.array(vendorOrderSchema)
});

export const orderListResponseSchema = paginatedResponseSchema(orderSchema.omit({ vendorOrders: true }));

export type OrderDto = z.infer<typeof orderSchema>;
