import { z } from "zod";
import { moneySchema, timestampSchema, uuidSchema } from "./common.js";
import { orderSchema } from "./orders.js";
import { paymentSchema } from "./payments.js";

export const cartItemSchema = z.object({
  id: uuidSchema, productId: uuidSchema, variantId: uuidSchema, productName: z.string(), variantTitle: z.string(), sku: z.string(), thumbnailUrl: z.string().url().nullable(), quantity: z.number().int().positive(), unitPrice: moneySchema, lineTotal: moneySchema, availableQuantity: z.number().int().nonnegative()
});
export const cartSchema = z.object({ id: uuidSchema, currency: z.string().length(3), items: z.array(cartItemSchema), subtotal: moneySchema, itemCount: z.number().int().nonnegative(), updatedAt: timestampSchema });
export const addCartItemSchema = z.object({ variantId: uuidSchema, quantity: z.number().int().min(1).max(99).default(1) });
export const updateCartItemSchema = z.object({ quantity: z.number().int().min(1).max(99) });
export const checkoutQuoteInputSchema = z.object({ couponCode: z.string().trim().min(3).max(40).transform((value) => value.toUpperCase()).nullable().optional() });
export const appliedCouponSchema = z.object({ code: z.string(), discountType: z.enum(["PERCENT", "FIXED"]), value: z.number().int().positive() });
export const checkoutQuoteSchema = z.object({ cart: cartSchema, subtotal: moneySchema, discount: moneySchema, delivery: moneySchema, tax: moneySchema, total: moneySchema, vendorCount: z.number().int().positive(), coupon: appliedCouponSchema.nullable(), expiresAt: timestampSchema });
export const paymentMethodSchema = z.enum(["COD", "BKASH", "NAGAD", "SSLCOMMERZ"]);
export const checkoutInputSchema = z.object({ addressId: uuidSchema, paymentMethod: paymentMethodSchema, couponCode: z.string().trim().min(3).max(40).transform((value) => value.toUpperCase()).nullable().optional() });
export const checkoutResultSchema = z.object({ order: orderSchema, payment: paymentSchema, invoiceNumber: z.string(), actionUrl: z.string().url().nullable(), instructions: z.string().nullable() });

export type CartDto = z.infer<typeof cartSchema>;
export type CheckoutQuote = z.infer<typeof checkoutQuoteSchema>;
export type CheckoutQuoteInput = z.infer<typeof checkoutQuoteInputSchema>;
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;
export type CheckoutResult = z.infer<typeof checkoutResultSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
