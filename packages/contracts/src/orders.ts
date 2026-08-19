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
  vendorName: z.string().optional(),
  shopName: z.string().optional(),
  status: vendorOrderStatusSchema,
  subtotal: moneySchema,
  discount: moneySchema,
  delivery: moneySchema,
  total: moneySchema,
  commission: moneySchema,
  version: versionSchema,
  items: z.array(orderItemSchema)
});

export const orderAddressSchema = z.object({
  recipientName: z.string(),
  phone: z.string(),
  line1: z.string(),
  line2: z.string().nullable(),
  division: z.string(),
  district: z.string(),
  upazila: z.string().nullable(),
  unionName: z.string().nullable(),
  postalCode: z.string().nullable()
});

export const orderPaymentSchema = z.object({
  provider: z.string(),
  method: z.string(),
  status: z.string(),
  amount: moneySchema,
  refunded: moneySchema.optional(),
  transactionId: z.string().nullable(),
  createdAt: timestampSchema
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
  customer: z.object({ displayName: z.string(), email: z.string().nullable(), phone: z.string().nullable() }).optional(),
  deliveryAddress: orderAddressSchema.nullable().optional(),
  payment: orderPaymentSchema.nullable().optional(),
  vendorOrders: z.array(vendorOrderSchema)
});

export const orderListResponseSchema = paginatedResponseSchema(orderSchema.omit({ vendorOrders: true }));
export const invoiceSchema = z.object({ id: uuidSchema, number: z.string(), issuedAt: timestampSchema, storageUrl: z.string().url().nullable(), order: orderSchema });

export type OrderDto = z.infer<typeof orderSchema>;
export type VendorOrderStatus = z.infer<typeof vendorOrderStatusSchema>;
export type ParentOrderStatus = z.infer<typeof parentOrderStatusSchema>;
