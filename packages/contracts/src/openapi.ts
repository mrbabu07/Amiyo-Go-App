import { OpenAPIRegistry, OpenApiGeneratorV31, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { catalogQuerySchema, categorySchema, createProductSchema, inventoryAdjustmentSchema, moderationInputSchema, productDetailSchema, productListResponseSchema, shopDetailSchema, shopListResponseSchema, updateProductSchema, vendorInventorySchema } from "./catalog.js";
import { addCartItemSchema, cartSchema, checkoutInputSchema, checkoutQuoteSchema, checkoutResultSchema, updateCartItemSchema } from "./commerce.js";
import { customerOrderSummarySchema, deliveryQueueItemSchema, deliveryRetryInputSchema, deliveryRetryResultSchema, orderTrackingSchema, vendorOrderDetailSchema, vendorOrderTransitionSchema } from "./delivery.js";
import { healthResponseSchema } from "./health.js";
import { addressInputSchema, addressSchema, deviceInputSchema, deviceSchema, sessionSchema, updateProfileSchema } from "./identity.js";
import { orderSchema } from "./orders.js";
import { problemSchema } from "./problem.js";
import { cancelOrderSchema, createReturnSchema, returnSchema, returnTransitionSchema } from "./returns.js";
import { codReconciliationInputSchema, completePayoutSchema, completeRefundSchema, createPayoutRequestSchema, reviewPayoutSchema, vendorFinanceSchema } from "./finance.js";
import { answerInputSchema, chatMessageInputSchema, chatThreadInputSchema, chatThreadSchema, createPromotionSchema, growthFeedSchema, notificationSchema, questionInputSchema, questionSchema, reviewInputSchema, reviewSchema, stockAlertInputSchema, wishlistItemInputSchema, wishlistSchema } from "./engagement.js";
import { createSupportTicketSchema, supportMessageInputSchema, supportTicketSchema, supportTicketStatusInputSchema } from "./support.js";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();
const problem = registry.register("Problem", problemSchema);
const health = registry.register("Health", healthResponseSchema);
const category = registry.register("Category", categorySchema);
const product = registry.register("Product", productDetailSchema);
const productList = registry.register("ProductList", productListResponseSchema);
const shop = registry.register("Shop", shopDetailSchema);
const shopList = registry.register("ShopList", shopListResponseSchema);
const vendorInventory = registry.register("VendorInventory", vendorInventorySchema);
const cart = registry.register("Cart", cartSchema);
const checkoutQuote = registry.register("CheckoutQuote", checkoutQuoteSchema);
const checkoutResult = registry.register("CheckoutResult", checkoutResultSchema);
const vendorOrderDetail = registry.register("VendorOrderDetail", vendorOrderDetailSchema);
const customerOrderSummary = registry.register("CustomerOrderSummary", customerOrderSummarySchema);
const orderTracking = registry.register("OrderTracking", orderTrackingSchema);
const order = registry.register("Order", orderSchema);
const session = registry.register("IdentitySession", sessionSchema);
const address = registry.register("Address", addressSchema);
const device = registry.register("Device", deviceSchema);
registry.registerComponent("securitySchemes", "firebaseBearer", { type: "http", scheme: "bearer", bearerFormat: "Firebase ID token" });
const firebaseSecurity = [{ firebaseBearer: [] }];

const errorResponses = {
  400: { description: "Invalid request", content: { "application/problem+json": { schema: problem } } },
  401: { description: "Authentication required", content: { "application/problem+json": { schema: problem } } },
  403: { description: "Insufficient permission", content: { "application/problem+json": { schema: problem } } },
  404: { description: "Resource not found", content: { "application/problem+json": { schema: problem } } }
};

registry.registerPath({
  method: "get",
  path: "/api/v2/cart",
  tags: ["Commerce"],
  security: firebaseSecurity,
  responses: { 200: { description: "Authoritative active cart", content: { "application/json": { schema: cart } } }, ...errorResponses }
});

registry.registerPath({
  method: "post",
  path: "/api/v2/cart/items",
  tags: ["Commerce"],
  security: firebaseSecurity,
  request: { body: { content: { "application/json": { schema: addCartItemSchema } } } },
  responses: { 201: { description: "Cart with added item", content: { "application/json": { schema: cart } } }, ...errorResponses }
});

registry.registerPath({
  method: "put",
  path: "/api/v2/cart/items/{id}",
  tags: ["Commerce"],
  security: firebaseSecurity,
  request: { params: z.object({ id: z.string().uuid() }), body: { content: { "application/json": { schema: updateCartItemSchema } } } },
  responses: { 200: { description: "Updated cart", content: { "application/json": { schema: cart } } }, ...errorResponses }
});

registry.registerPath({
  method: "delete",
  path: "/api/v2/cart/items/{id}",
  tags: ["Commerce"],
  security: firebaseSecurity,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: { 200: { description: "Cart after item removal", content: { "application/json": { schema: cart } } }, ...errorResponses }
});

registry.registerPath({
  method: "post",
  path: "/api/v2/checkout/quote",
  tags: ["Commerce"],
  security: firebaseSecurity,
  responses: { 200: { description: "Short-lived authoritative checkout quote", content: { "application/json": { schema: checkoutQuote } } }, ...errorResponses }
});

registry.registerPath({
  method: "post",
  path: "/api/v2/checkout/orders",
  tags: ["Commerce"],
  security: firebaseSecurity,
  request: { headers: z.object({ "idempotency-key": z.string().uuid() }), body: { content: { "application/json": { schema: checkoutInputSchema } } } },
  responses: { 201: { description: "Durable order and payment initiation", content: { "application/json": { schema: checkoutResult } } }, ...errorResponses }
});

registry.registerPath({
  method: "get",
  path: "/health",
  tags: ["Operations"],
  responses: { 200: { description: "Service health", content: { "application/json": { schema: health } } } }
});

registry.registerPath({
  method: "post",
  path: "/api/v2/auth/session",
  tags: ["Identity"],
  security: firebaseSecurity,
  responses: { 200: { description: "Synchronized trusted user session", content: { "application/json": { schema: session } } }, ...errorResponses }
});

registry.registerPath({
  method: "get",
  path: "/api/v2/me",
  tags: ["Identity"],
  security: firebaseSecurity,
  responses: { 200: { description: "Current user profile and authorization context", content: { "application/json": { schema: session } } }, ...errorResponses }
});

registry.registerPath({
  method: "patch",
  path: "/api/v2/me",
  tags: ["Identity"],
  security: firebaseSecurity,
  request: { body: { content: { "application/json": { schema: updateProfileSchema } } } },
  responses: { 200: { description: "Updated profile", content: { "application/json": { schema: session } } }, ...errorResponses }
});

registry.registerPath({
  method: "get",
  path: "/api/v2/me/addresses",
  tags: ["Identity"],
  security: firebaseSecurity,
  responses: { 200: { description: "Current user addresses", content: { "application/json": { schema: z.array(address) } } }, ...errorResponses }
});

registry.registerPath({
  method: "post",
  path: "/api/v2/me/addresses",
  tags: ["Identity"],
  security: firebaseSecurity,
  request: { body: { content: { "application/json": { schema: addressInputSchema } } } },
  responses: { 201: { description: "Created address", content: { "application/json": { schema: address } } }, ...errorResponses }
});

registry.registerPath({
  method: "get",
  path: "/api/v2/devices",
  tags: ["Identity"],
  security: firebaseSecurity,
  responses: { 200: { description: "Registered devices", content: { "application/json": { schema: z.array(device) } } }, ...errorResponses }
});

registry.registerPath({
  method: "post",
  path: "/api/v2/devices",
  tags: ["Identity"],
  security: firebaseSecurity,
  request: { body: { content: { "application/json": { schema: deviceInputSchema } } } },
  responses: { 201: { description: "Registered device", content: { "application/json": { schema: device } } }, ...errorResponses }
});

registry.registerPath({
  method: "get",
  path: "/api/v2/catalog/categories",
  tags: ["Catalog"],
  responses: { 200: { description: "Active catalog categories", content: { "application/json": { schema: z.array(category) } } } }
});

registry.registerPath({
  method: "get",
  path: "/api/v2/catalog/products",
  tags: ["Catalog"],
  request: { query: z.object({ cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(100).optional(), query: z.string().optional() }) },
  responses: { 200: { description: "Cursor-paginated products", content: { "application/json": { schema: productList } } } }
});

registry.registerPath({
  method: "get",
  path: "/api/v2/catalog/products/{id}",
  tags: ["Catalog"],
  request: { params: z.object({ id: z.string().min(1) }) },
  responses: { 200: { description: "Product detail", content: { "application/json": { schema: product } } }, ...errorResponses }
});

registry.registerPath({
  method: "get",
  path: "/api/v2/catalog/search",
  tags: ["Catalog"],
  request: { query: catalogQuerySchema },
  responses: { 200: { description: "Search results", content: { "application/json": { schema: productList } } } }
});

registry.registerPath({
  method: "get",
  path: "/api/v2/shops",
  tags: ["Shops"],
  responses: { 200: { description: "Active shops", content: { "application/json": { schema: shopList } } } }
});

registry.registerPath({
  method: "get",
  path: "/api/v2/shops/{id}",
  tags: ["Shops"],
  request: { params: z.object({ id: z.string().min(1) }) },
  responses: { 200: { description: "Shop and products", content: { "application/json": { schema: shop } } }, ...errorResponses }
});

registry.registerPath({
  method: "post",
  path: "/api/v2/vendor/products",
  tags: ["Vendor Catalog"],
  security: firebaseSecurity,
  request: { body: { content: { "application/json": { schema: createProductSchema } } } },
  responses: { 201: { description: "Draft product created" }, ...errorResponses }
});

registry.registerPath({
  method: "patch",
  path: "/api/v2/vendor/products/{id}",
  tags: ["Vendor Catalog"],
  security: firebaseSecurity,
  request: { params: z.object({ id: z.string().uuid() }), body: { content: { "application/json": { schema: updateProductSchema } } } },
  responses: { 200: { description: "Draft product updated" }, ...errorResponses }
});

registry.registerPath({
  method: "put",
  path: "/api/v2/vendor/inventory/{id}",
  tags: ["Vendor Catalog"],
  security: firebaseSecurity,
  request: { params: z.object({ id: z.string().uuid() }), body: { content: { "application/json": { schema: inventoryAdjustmentSchema } } } },
  responses: { 200: { description: "Inventory adjusted", content: { "application/json": { schema: vendorInventory } } }, ...errorResponses }
});

registry.registerPath({
  method: "post",
  path: "/api/v2/admin/catalog/products/{id}/moderate",
  tags: ["Catalog Moderation"],
  security: firebaseSecurity,
  request: { params: z.object({ id: z.string().uuid() }), body: { content: { "application/json": { schema: moderationInputSchema } } } },
  responses: { 200: { description: "Product approved or rejected" }, ...errorResponses }
});

registry.registerPath({ method: "get", path: "/api/v2/orders", tags: ["Orders"], security: firebaseSecurity, responses: { 200: { description: "Current customer orders", content: { "application/json": { schema: z.array(customerOrderSummary) } } }, ...errorResponses } });
registry.registerPath({ method: "get", path: "/api/v2/orders/{id}", tags: ["Orders"], security: firebaseSecurity, request: { params: z.object({ id: z.string().uuid() }) }, responses: { 200: { description: "Customer order detail", content: { "application/json": { schema: order } } }, ...errorResponses } });
registry.registerPath({ method: "get", path: "/api/v2/orders/{id}/tracking", tags: ["Delivery"], security: firebaseSecurity, request: { params: z.object({ id: z.string().uuid() }) }, responses: { 200: { description: "Customer shipment tracking", content: { "application/json": { schema: orderTracking } } }, ...errorResponses } });
registry.registerPath({ method: "get", path: "/api/v2/vendor/orders", tags: ["Vendor Orders"], security: firebaseSecurity, responses: { 200: { description: "Vendor-scoped fulfillment queue", content: { "application/json": { schema: z.array(vendorOrderDetail) } } }, ...errorResponses } });
registry.registerPath({ method: "get", path: "/api/v2/vendor/orders/{id}", tags: ["Vendor Orders"], security: firebaseSecurity, request: { params: z.object({ id: z.string().uuid() }) }, responses: { 200: { description: "Vendor order detail", content: { "application/json": { schema: vendorOrderDetail } } }, ...errorResponses } });
registry.registerPath({ method: "post", path: "/api/v2/vendor/orders/{id}/transitions", tags: ["Vendor Orders"], security: firebaseSecurity, request: { params: z.object({ id: z.string().uuid() }), headers: z.object({ "idempotency-key": z.string().uuid() }), body: { content: { "application/json": { schema: vendorOrderTransitionSchema } } } }, responses: { 200: { description: "Transitioned vendor order", content: { "application/json": { schema: vendorOrderDetail } } }, ...errorResponses } });
registry.registerPath({ method: "post", path: "/api/v2/orders/{id}/cancel", tags: ["Returns & Finance"], security: firebaseSecurity, request: { params: z.object({ id: z.string().uuid() }), headers: z.object({ "idempotency-key": z.string().uuid() }), body: { content: { "application/json": { schema: cancelOrderSchema } } } }, responses: { 200: { description: "Cancelled order and released active reservations" }, ...errorResponses } });
registry.registerPath({ method: "get", path: "/api/v2/returns", tags: ["Returns & Finance"], security: firebaseSecurity, responses: { 200: { description: "Customer returns", content: { "application/json": { schema: z.array(returnSchema) } } }, ...errorResponses } });
registry.registerPath({ method: "post", path: "/api/v2/returns", tags: ["Returns & Finance"], security: firebaseSecurity, request: { headers: z.object({ "idempotency-key": z.string().uuid() }), body: { content: { "application/json": { schema: createReturnSchema } } } }, responses: { 201: { description: "Return requested", content: { "application/json": { schema: returnSchema } } }, ...errorResponses } });
registry.registerPath({ method: "get", path: "/api/v2/vendor/finance", tags: ["Returns & Finance"], security: firebaseSecurity, responses: { 200: { description: "Derived vendor balance and ledger", content: { "application/json": { schema: vendorFinanceSchema } } }, ...errorResponses } });
registry.registerPath({ method: "post", path: "/api/v2/vendor/payouts", tags: ["Returns & Finance"], security: firebaseSecurity, request: { headers: z.object({ "idempotency-key": z.string().uuid() }), body: { content: { "application/json": { schema: createPayoutRequestSchema } } } }, responses: { 201: { description: "Payout requested and balance reserved" }, ...errorResponses } });
registry.registerPath({ method: "post", path: "/api/v2/admin/returns/{id}/transitions", tags: ["Operations"], security: firebaseSecurity, request: { params: z.object({ id: z.string().uuid() }), headers: z.object({ "idempotency-key": z.string().uuid() }), body: { content: { "application/json": { schema: returnTransitionSchema } } } }, responses: { 200: { description: "Return workflow transitioned", content: { "application/json": { schema: returnSchema } } }, ...errorResponses } });
registry.registerPath({ method: "post", path: "/api/v2/admin/returns/{id}/refund-completion", tags: ["Operations"], security: firebaseSecurity, request: { params: z.object({ id: z.string().uuid() }), headers: z.object({ "idempotency-key": z.string().uuid() }), body: { content: { "application/json": { schema: completeRefundSchema } } } }, responses: { 200: { description: "Provider-confirmed refund completed" }, ...errorResponses } });
registry.registerPath({ method: "post", path: "/api/v2/admin/payouts/{id}/review", tags: ["Operations"], security: firebaseSecurity, request: { params: z.object({ id: z.string().uuid() }), headers: z.object({ "idempotency-key": z.string().uuid() }), body: { content: { "application/json": { schema: reviewPayoutSchema } } } }, responses: { 200: { description: "Payout request reviewed" }, ...errorResponses } });
registry.registerPath({ method: "post", path: "/api/v2/admin/payouts/{id}/completion", tags: ["Operations"], security: firebaseSecurity, request: { params: z.object({ id: z.string().uuid() }), headers: z.object({ "idempotency-key": z.string().uuid() }), body: { content: { "application/json": { schema: completePayoutSchema } } } }, responses: { 200: { description: "Provider-confirmed payout completed" }, ...errorResponses } });
registry.registerPath({ method: "post", path: "/api/v2/admin/cod/reconciliations", tags: ["Operations"], security: firebaseSecurity, request: { headers: z.object({ "idempotency-key": z.string().uuid() }), body: { content: { "application/json": { schema: codReconciliationInputSchema } } } }, responses: { 201: { description: "COD period reconciled" }, ...errorResponses } });
registry.registerPath({ method: "get", path: "/api/v2/admin/delivery-queue", tags: ["Operations"], security: firebaseSecurity, responses: { 200: { description: "Recent pending and failed delivery dispatches", content: { "application/json": { schema: z.array(deliveryQueueItemSchema) } } }, ...errorResponses } });
registry.registerPath({ method: "post", path: "/api/v2/admin/delivery-queue/{id}/retry", tags: ["Operations"], security: firebaseSecurity, request: { params: z.object({ id: z.string().uuid() }), headers: z.object({ "idempotency-key": z.string().uuid() }), body: { content: { "application/json": { schema: deliveryRetryInputSchema } } } }, responses: { 200: { description: "Failed delivery dispatch requeued with its original stable job identity", content: { "application/json": { schema: deliveryRetryResultSchema } } }, ...errorResponses } });
registry.registerPath({ method: "get", path: "/api/v2/growth/feed", tags: ["Engagement & Growth"], responses: { 200: { description: "Active campaigns and flash sales", content: { "application/json": { schema: growthFeedSchema } } }, ...errorResponses } });
registry.registerPath({ method: "get", path: "/api/v2/wishlist", tags: ["Engagement & Growth"], security: firebaseSecurity, responses: { 200: { description: "Current customer wishlist", content: { "application/json": { schema: wishlistSchema } } }, ...errorResponses } });
registry.registerPath({ method: "post", path: "/api/v2/wishlist/items", tags: ["Engagement & Growth"], security: firebaseSecurity, request: { body: { content: { "application/json": { schema: wishlistItemInputSchema } } } }, responses: { 201: { description: "Product saved", content: { "application/json": { schema: wishlistSchema } } }, ...errorResponses } });
registry.registerPath({ method: "put", path: "/api/v2/alerts/{productId}", tags: ["Engagement & Growth"], security: firebaseSecurity, request: { params: z.object({ productId: z.string().uuid() }), body: { content: { "application/json": { schema: stockAlertInputSchema.omit({ productId: true }) } } } }, responses: { 200: { description: "Stock or price alert saved" }, ...errorResponses } });
registry.registerPath({ method: "get", path: "/api/v2/catalog/products/{productId}/reviews", tags: ["Engagement & Growth"], request: { params: z.object({ productId: z.string().uuid() }) }, responses: { 200: { description: "Published product reviews", content: { "application/json": { schema: z.array(reviewSchema) } } }, ...errorResponses } });
registry.registerPath({ method: "get", path: "/api/v2/reviews", tags: ["Engagement & Growth"], security: firebaseSecurity, responses: { 200: { description: "Current customer reviews", content: { "application/json": { schema: z.array(reviewSchema) } } }, ...errorResponses } });
registry.registerPath({ method: "post", path: "/api/v2/reviews", tags: ["Engagement & Growth"], security: firebaseSecurity, request: { body: { content: { "application/json": { schema: reviewInputSchema } } } }, responses: { 201: { description: "Verified-purchase review created", content: { "application/json": { schema: reviewSchema } } }, ...errorResponses } });
registry.registerPath({ method: "get", path: "/api/v2/catalog/products/{productId}/questions", tags: ["Engagement & Growth"], request: { params: z.object({ productId: z.string().uuid() }) }, responses: { 200: { description: "Product questions and answers", content: { "application/json": { schema: z.array(questionSchema) } } }, ...errorResponses } });
registry.registerPath({ method: "post", path: "/api/v2/catalog/products/{productId}/questions", tags: ["Engagement & Growth"], security: firebaseSecurity, request: { params: z.object({ productId: z.string().uuid() }), body: { content: { "application/json": { schema: questionInputSchema } } } }, responses: { 201: { description: "Question created", content: { "application/json": { schema: questionSchema } } }, ...errorResponses } });
registry.registerPath({ method: "post", path: "/api/v2/questions/{id}/answers", tags: ["Engagement & Growth"], security: firebaseSecurity, request: { params: z.object({ id: z.string().uuid() }), body: { content: { "application/json": { schema: answerInputSchema } } } }, responses: { 201: { description: "Vendor answer created" }, ...errorResponses } });
registry.registerPath({ method: "get", path: "/api/v2/notifications", tags: ["Engagement & Growth"], security: firebaseSecurity, responses: { 200: { description: "Current user notifications", content: { "application/json": { schema: z.array(notificationSchema) } } }, ...errorResponses } });
registry.registerPath({ method: "get", path: "/api/v2/chat/threads", tags: ["Engagement & Growth"], security: firebaseSecurity, responses: { 200: { description: "Participant-scoped chat threads", content: { "application/json": { schema: z.array(chatThreadSchema) } } }, ...errorResponses } });
registry.registerPath({ method: "post", path: "/api/v2/chat/threads", tags: ["Engagement & Growth"], security: firebaseSecurity, request: { body: { content: { "application/json": { schema: chatThreadInputSchema } } } }, responses: { 201: { description: "Secure vendor chat created" }, ...errorResponses } });
registry.registerPath({ method: "post", path: "/api/v2/chat/threads/{id}/messages", tags: ["Engagement & Growth"], security: firebaseSecurity, request: { params: z.object({ id: z.string().uuid() }), body: { content: { "application/json": { schema: chatMessageInputSchema } } } }, responses: { 201: { description: "Message created" }, ...errorResponses } });
registry.registerPath({ method: "post", path: "/api/v2/admin/promotions", tags: ["Engagement & Growth"], security: firebaseSecurity, request: { body: { content: { "application/json": { schema: createPromotionSchema } } } }, responses: { 201: { description: "Versioned promotion created" }, ...errorResponses } });
registry.registerPath({ method: "get", path: "/api/v2/support/tickets", tags: ["Support"], security: firebaseSecurity, responses: { 200: { description: "Current customer support tickets", content: { "application/json": { schema: z.array(supportTicketSchema) } } }, ...errorResponses } });
registry.registerPath({ method: "post", path: "/api/v2/support/tickets", tags: ["Support"], security: firebaseSecurity, request: { body: { content: { "application/json": { schema: createSupportTicketSchema } } } }, responses: { 201: { description: "Support ticket created", content: { "application/json": { schema: supportTicketSchema } } }, ...errorResponses } });
registry.registerPath({ method: "post", path: "/api/v2/support/tickets/{id}/messages", tags: ["Support"], security: firebaseSecurity, request: { params: z.object({ id: z.string().uuid() }), body: { content: { "application/json": { schema: supportMessageInputSchema } } } }, responses: { 201: { description: "Support reply created", content: { "application/json": { schema: supportTicketSchema } } }, ...errorResponses } });
registry.registerPath({ method: "get", path: "/api/v2/admin/support/tickets", tags: ["Support"], security: firebaseSecurity, responses: { 200: { description: "Support staff ticket queue", content: { "application/json": { schema: z.array(supportTicketSchema) } } }, ...errorResponses } });
registry.registerPath({ method: "patch", path: "/api/v2/admin/support/tickets/{id}/status", tags: ["Support"], security: firebaseSecurity, request: { params: z.object({ id: z.string().uuid() }), body: { content: { "application/json": { schema: supportTicketStatusInputSchema } } } }, responses: { 200: { description: "Support ticket status updated", content: { "application/json": { schema: supportTicketSchema } } }, ...errorResponses } });

export function createOpenApiDocument() {
  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: "3.1.0",
    info: { title: "Amiyo-Go API", version: "0.9.0", description: "Typed API contract for the Amiyo-Go mobile platform." },
    servers: [{ url: "http://localhost:4000", description: "Local development" }],
    tags: [{ name: "Operations" }, { name: "Returns & Finance" }, { name: "Engagement & Growth" }, { name: "Support" }, { name: "Identity" }, { name: "Catalog" }, { name: "Shops" }, { name: "Vendor Catalog" }, { name: "Catalog Moderation" }, { name: "Commerce" }, { name: "Orders" }, { name: "Vendor Orders" }, { name: "Delivery" }]
  });
}
