import assert from "node:assert/strict";
import test from "node:test";
import { accountPreferencesSchema, addCartItemSchema, addressInputSchema, adminOrderDetailSchema, cancelOrderSchema, catalogQuerySchema, checkoutInputSchema, checkoutQuoteSchema, commissionRuleInputSchema, createOpenApiDocument, createProductSchema, createReturnSchema, deviceInputSchema, minorUnitSchema, moneySchema, productReportInputSchema, publicPlatformSettingsSchema, vendorOrderStatusSchema, vendorRegistrationSchema } from "./index.js";
import { adminAssistedCartInputSchema } from "./admin.js";

test("money contracts preserve bigint-safe minor units", () => {
  assert.deepEqual(moneySchema.parse({ amountMinor: "249000", currency: "bdt" }), { amountMinor: "249000", currency: "BDT" });
  assert.equal(minorUnitSchema.safeParse(-1).success, false);
  assert.equal(minorUnitSchema.safeParse("12.50").success, false);
});

test("vendor order contract follows the approved state machine", () => {
  assert.equal(vendorOrderStatusSchema.safeParse("PLACED").success, true);
  assert.equal(vendorOrderStatusSchema.safeParse("PACKED").success, false);
});

test("cancellation records a bounded actor-aware reason taxonomy", () => {
  assert.equal(cancelOrderSchema.parse({ reasonCode: "WRONG_ADDRESS", reason: "Selected my old address", expectedVersion: 2 }).reasonCode, "WRONG_ADDRESS");
  assert.equal(cancelOrderSchema.parse({ reason: "Legacy saved request", expectedVersion: 2 }).reasonCode, "OTHER");
  assert.equal(cancelOrderSchema.safeParse({ reasonCode: "UNBOUNDED_REASON", reason: "Invalid taxonomy", expectedVersion: 2 }).success, false);
});

test("release-one notification preferences reject unavailable channels", () => {
  const preferences = { notificationPreferences: { orderUpdates: { email: false, sms: false, push: true }, promotions: { email: false, sms: false, push: false }, priceDrops: { email: true, sms: false, push: true }, vendorNews: { email: false, sms: false, push: false } }, privacy: { wishlistVisibility: "private", reviewHistoryVisibility: "public", personalization: true } };
  assert.equal(accountPreferencesSchema.safeParse(preferences).success, true);
  assert.equal(accountPreferencesSchema.safeParse({ ...preferences, notificationPreferences: { ...preferences.notificationPreferences, orderUpdates: { email: true, sms: false, push: true } } }).success, false);
  assert.equal(accountPreferencesSchema.safeParse({ ...preferences, notificationPreferences: { ...preferences.notificationPreferences, priceDrops: { email: true, sms: true, push: true } } }).success, false);
});

test("OpenAPI document exposes typed v2 resources", () => {
  const document = createOpenApiDocument();
  assert.equal(document.openapi, "3.1.0");
  assert.ok(document.paths?.["/api/v2/catalog/products"]);
  assert.ok(document.paths?.["/api/v2/shops/{id}/follow"]?.put?.security);
  assert.ok(document.paths?.["/api/v2/me/followed-shops"]?.get?.security);
  assert.ok(document.paths?.["/api/v2/orders/{id}"]);
  assert.ok(document.paths?.["/api/v2/auth/session"]);
  assert.ok(document.paths?.["/api/v2/me/addresses"]);
  assert.ok(document.paths?.["/api/v2/me/export"]);
  assert.ok(document.paths?.["/api/v2/cart"]);
  assert.ok(document.paths?.["/api/v2/checkout/orders"]);
  assert.ok(document.paths?.["/api/v2/vendor/orders/{id}/transitions"]);
  assert.ok(document.paths?.["/api/v2/orders/{id}/tracking"]);
  assert.ok(document.paths?.["/api/v2/orders/{id}/invoice"]);
  assert.ok(document.paths?.["/api/v2/admin/workspace/orders/{id}"]);
  assert.ok(document.paths?.["/api/v2/returns"]);
  assert.ok(document.paths?.["/api/v2/vendor/finance"]);
  assert.ok(document.paths?.["/api/v2/admin/cod/reconciliations"]);
  assert.ok(document.paths?.["/api/v2/growth/feed"]);
  assert.ok(document.paths?.["/api/v2/wishlist"]);
  assert.ok(document.paths?.["/api/v2/wishlist/share"]);
  assert.ok(document.paths?.["/api/v2/wishlist/collections"]?.get?.security);
  assert.ok(document.paths?.["/api/v2/wishlist/collections"]?.post?.requestBody);
  assert.ok(document.paths?.["/api/v2/wishlist/collections/{id}"]?.patch?.security);
  assert.ok(document.paths?.["/api/v2/wishlist/collections/{id}"]?.delete?.security);
  assert.ok(document.paths?.["/api/v2/wishlist/items/{productId}"]?.delete?.parameters);
  assert.ok(document.paths?.["/api/v2/wishlists/shared/{token}"]);
  assert.ok(document.paths?.["/api/v2/loyalty/referral"]);
  assert.ok(document.paths?.["/api/v2/loyalty/referral/apply"]);
  assert.ok(document.paths?.["/api/v2/notifications"]);
  assert.ok(document.paths?.["/api/v2/chat/threads"]);
  assert.ok(document.paths?.["/api/v2/admin/workspace/categories/{id}/attributes"]);
  assert.ok(document.paths?.["/api/v2/admin/workspace/analytics"]);
  assert.ok(document.paths?.["/api/v2/vendor/products/import"]);
  assert.ok(document.paths?.["/api/v2/vendor/products/export.csv"]);
  assert.ok(document.paths?.["/api/v2/vendor/workspace/category-requests"]);
  assert.ok(document.paths?.["/api/v2/vendor/registrations"]);
  assert.ok(document.paths?.["/api/v2/admin/workspace/category-requests/{id}"]);
  assert.ok(document.paths?.["/api/v2/admin/workspace/payment-verifications/{id}/evidence/{uploadId}/access"]?.post?.security);
  assert.ok(document.paths?.["/api/v2/vendor/orders/{id}/documents"]);
  assert.ok(document.paths?.["/api/v2/media/uploads"]);
  assert.ok(document.paths?.["/api/v2/catalog/products/{productId}/reports"]);
});

test("product reports use bounded trust reasons and evidence", () => {
  assert.equal(productReportInputSchema.safeParse({ reason: "counterfeit", details: "Logo and serial number appear fake" }).success, true);
  assert.equal(productReportInputSchema.safeParse({ reason: "spam", details: "Invalid reason" }).success, false);
});

test("vendor registration requires consent and unique categories", () => {
  const categoryId = crypto.randomUUID();
  const base = { legalName: "Example Commerce", displayName: "Example Shop", phone: "01700000000", address: { line1: "Road 1", division: "Dhaka", district: "Dhaka", upazila: "Savar" }, categoryIds: [categoryId], termsVersion: "2026.06", privacyVersion: "2026.06" };
  assert.equal(vendorRegistrationSchema.safeParse({ ...base, acceptedTerms: true }).success, true);
  assert.equal(vendorRegistrationSchema.safeParse({ ...base, acceptedTerms: false }).success, false);
  assert.equal(vendorRegistrationSchema.safeParse({ ...base, acceptedTerms: true, categoryIds: [categoryId, categoryId] }).success, false);
});

test("return contracts reject duplicate items and invalid quantities", () => {
  const item = { orderItemId: crypto.randomUUID(), quantity: 1 };
  const normalized = createReturnSchema.safeParse({ vendorOrderId: crypto.randomUUID(), reasonCode: "damaged", items: [item] });
  assert.equal(normalized.success, true);
  if (normalized.success) assert.equal(normalized.data.reasonCode, "DAMAGED");
  assert.equal(createReturnSchema.safeParse({ vendorOrderId: crypto.randomUUID(), reasonCode: "damaged", items: [item, item] }).success, false);
  assert.equal(createReturnSchema.safeParse({ vendorOrderId: crypto.randomUUID(), reasonCode: "changed_mind", items: [item] }).success, false);
});

test("commerce contracts enforce quantities and supported payments", () => {
  assert.equal(addCartItemSchema.safeParse({ variantId: crypto.randomUUID(), quantity: 0 }).success, false);
  assert.equal(checkoutInputSchema.safeParse({ addressId: crypto.randomUUID(), paymentMethod: "BKASH" }).success, false);
  assert.equal(checkoutInputSchema.safeParse({ addressId: crypto.randomUUID(), paymentMethod: "BITCOIN" }).success, false);
  const cartItemId = crypto.randomUUID();
  assert.equal(checkoutInputSchema.safeParse({ addressId: crypto.randomUUID(), paymentMethod: "COD", cartItemIds: [cartItemId] }).success, true);
  assert.equal(checkoutInputSchema.safeParse({ addressId: crypto.randomUUID(), paymentMethod: "COD", cartItemIds: [cartItemId, cartItemId] }).success, false);
});

test("checkout quotes require an authoritative seller package breakdown", () => {
  const packageId = crypto.randomUUID();
  const shopId = crypto.randomUUID();
  const amount = (amountMinor: string) => ({ amountMinor, currency: "BDT" });
  assert.equal(checkoutQuoteSchema.shape.packages.safeParse([]).success, false);
  assert.equal(checkoutQuoteSchema.shape.packages.safeParse([{ vendorId: packageId, shopId, shopName: "Village Store", itemCount: 2, subtotal: amount("150000"), discount: amount("10000"), delivery: amount("6000"), total: amount("146000") }]).success, true);
});

test("assisted cart contracts require bounded quantities and an audit reason", () => {
  const variantId = crypto.randomUUID();
  assert.equal(adminAssistedCartInputSchema.safeParse({ variantId, quantity: 2, reason: "Customer called support" }).success, true);
  assert.equal(adminAssistedCartInputSchema.safeParse({ variantId, quantity: 0, reason: "Customer called support" }).success, false);
  assert.equal(adminAssistedCartInputSchema.safeParse({ variantId, quantity: 2, reason: "call" }).success, false);
});

test("public settings validate admin-controlled village operations", () => {
  const settings = publicPlatformSettingsSchema.parse({ featureFlags: { sellerRegistration: true, reviews: true, questions: true, flashSales: true, loyalty: true, voiceSearch: true, googleLogin: true }, paymentMethods: { cod: { enabled: true }, sslcommerz: { enabled: true }, bkashManual: { enabled: true } }, maintenanceMode: { enabled: false, message: "Marketplace is available" }, villageOperations: { enabled: true, defaultLocale: "bn", lowDataModeDefault: true, allowCustomerLowDataOverride: true, requireCodPhoneConfirmation: true, requireUnionForDelivery: true, ruralDeliveryEnabled: true, assistedOrderingEnabled: true, smsOrderUpdatesEnabled: false, pickupPointsEnabled: false, supportPhone: "01700000000", supportWhatsapp: "8801700000000" }, version: 1 });
  assert.equal(settings.villageOperations.defaultLocale, "bn");
  assert.equal(settings.villageOperations.requireCodPhoneConfirmation, true);
  assert.equal(publicPlatformSettingsSchema.safeParse({ ...settings, villageOperations: { ...settings.villageOperations, smsOrderUpdatesEnabled: true } }).success, false);
  assert.equal(publicPlatformSettingsSchema.safeParse({ ...settings, villageOperations: { ...settings.villageOperations, pickupPointsEnabled: true } }).success, true);
});

test("identity mutation contracts reject incomplete data", () => {
  assert.equal(addressInputSchema.safeParse({ label: "Home" }).success, false);
  assert.equal(deviceInputSchema.safeParse({ installationId: "install-123", platform: "web", pushToken: "token-value" }).success, false);
});

test("commission rules require bounded non-zero fees and valid dates", () => {
  const base = { vendorId: null, shopId: null, categoryId: null, productId: null, rateBps: 750, fixedMinor: "0", currency: "BDT", effectiveFrom: new Date().toISOString(), effectiveTo: null };
  assert.equal(commissionRuleInputSchema.safeParse(base).success, true);
  assert.equal(commissionRuleInputSchema.safeParse({ ...base, productId: "11111111-1111-4111-8111-111111111111", rateBps: 150 }).success, true);
  assert.equal(commissionRuleInputSchema.safeParse({ ...base, rateBps: 0 }).success, false);
  assert.equal(commissionRuleInputSchema.safeParse({ ...base, rateBps: 5001 }).success, false);
});

test("admin order detail keeps printable commerce records structured", () => {
  const base = { amountMinor: "10000", currency: "BDT" };
  const parsed = adminOrderDetailSchema.safeParse({ id: "11111111-1111-4111-8111-111111111111", orderNumber: "AGO-100", status: "CONFIRMED", version: 1, createdAt: "2026-08-14T00:00:00.000Z", placedAt: "2026-08-14T00:00:00.000Z", customer: { id: "22222222-2222-4222-8222-222222222222", displayName: "Customer", email: "customer@example.com", phone: null }, deliveryAddress: null, fulfillmentMethod: "DELIVERY", pickupPoint: null, payment: null, invoice: null, subtotal: base, discount: { amountMinor: "0", currency: "BDT" }, delivery: { amountMinor: "0", currency: "BDT" }, tax: { amountMinor: "0", currency: "BDT" }, total: base, events: [], vendorOrders: [] });
  assert.equal(parsed.success, true);
});

test("catalog contracts enforce bounded pagination and integer money", () => {
  assert.equal(catalogQuerySchema.safeParse({ limit: 51 }).success, false);
  assert.equal(catalogQuerySchema.parse({ limit: 20, query: " headphones " }).query, "headphones");
  assert.equal(createProductSchema.safeParse({ shopId: crypto.randomUUID(), categoryId: crypto.randomUUID(), name: "Test product", slug: "test-product", variants: [{ sku: "SKU-1", title: "Default", priceMinor: "12.50" }] }).success, false);
});
