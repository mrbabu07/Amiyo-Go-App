import { createHash, randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { CheckoutInput, CheckoutQuoteInput, CheckoutResult, Session } from "@amiyo/contracts";
import { loyaltyRedemption, stackedPromotionDiscount, type PromotionCandidate } from "@amiyo/domain";
import { withSerializableTransaction } from "../../infrastructure/database/transaction.js";
import { ApiProblem } from "../../middleware/api-problem.js";
import { CommissionService } from "../finance/commission.service.js";
import { OutboxRepository } from "../outbox/outbox.repository.js";
import { loadBusinessRules } from "../admin/business-rules-config.js";
import { expireLoyaltyBalance } from "../engagement/loyalty-ledger.js";

const cartInclude = { items: { orderBy: { createdAt: "asc" as const }, include: { product: { include: { shop: true } }, variant: { include: { inventory: true, media: { orderBy: { displayOrder: "asc" as const }, take: 1 } } } } } } satisfies Prisma.CartInclude;
export function shopVacationActive(settings: Prisma.JsonValue | null, now = Date.now()) { if (!settings || typeof settings !== "object" || Array.isArray(settings)) return false; const raw = (settings as Record<string, unknown>).vacationMode; if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false; const value = raw as Record<string, unknown>; const starts = typeof value.startsAt === "string" ? Date.parse(value.startsAt) : NaN; const ends = typeof value.endsAt === "string" ? Date.parse(value.endsAt) : NaN; return value.enabled === true && Number.isFinite(starts) && Number.isFinite(ends) && starts <= now && now < ends; }
const orderInclude = { vendorOrders: { include: { items: true } } } satisfies Prisma.OrderInclude;
type LoadedCart = Prisma.CartGetPayload<{ include: typeof cartInclude }>;
type LoadedOrder = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
type CommerceDatabase = PrismaClient | Prisma.TransactionClient;

function mediaUrl(key: string | undefined) { if (!key) return null; if (/^https?:\/\//.test(key)) return key; const base = process.env.OBJECT_STORAGE_PUBLIC_URL?.replace(/\/$/, ""); return base ? `${base}/${key}` : null; }
const money = (amount: bigint, currency = "BDT") => ({ amountMinor: amount.toString(), currency });
const notificationMoney = (amount: bigint) => `${(amount / 100n).toLocaleString("en-BD")}.${(amount % 100n).toString().padStart(2, "0")}`;
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
async function notifyOrderAdmins(transaction: Prisma.TransactionClient, order: { id: string; orderNumber: string; totalMinor: bigint; currency: string }) {
  const roleRows = await transaction.userRole.findMany({ where: { user: { status: "ACTIVE" }, role: { name: { in: ["SUPER_ADMIN", "OPERATIONS_ADMIN"] } } }, select: { userId: true } });
  const userIds = [...new Set(roleRows.map(({ userId }) => userId))];
  for (const userId of userIds) await transaction.notification.upsert({ where: { idempotencyKey: `admin-order-placed:${order.id}:${userId}` }, update: {}, create: { userId, type: "admin.order.placed", title: `New order ${order.orderNumber}`, body: `A new order worth ৳${(Number(order.totalMinor) / 100).toLocaleString("en-BD")} requires marketplace monitoring.`, data: { href: `/admin/orders/${order.id}` }, idempotencyKey: `admin-order-placed:${order.id}:${userId}`, deliveries: { create: { channel: "in_app", status: "DELIVERED", deliveredAt: new Date() } } } });
}

export async function notifyOrderVendors(transaction: Prisma.TransactionClient, order: { id: string; orderNumber: string }, packages: Array<{ id: string; vendorId: string; itemCount: number; totalMinor: bigint }>) {
  if (!packages.length) return;
  const vendorIds = packages.map((item) => item.vendorId); const [members, shops] = await Promise.all([transaction.vendorMember.findMany({ where: { vendorId: { in: vendorIds }, status: "active", user: { status: "ACTIVE" } }, select: { userId: true, vendorId: true } }), transaction.vendorShop.findMany({ where: { vendorId: { in: vendorIds } }, select: { vendorId: true, settings: true } })]);
  const membersByVendor = new Map<string, string[]>();
  for (const member of members) membersByVendor.set(member.vendorId, [...(membersByVendor.get(member.vendorId) ?? []), member.userId]);
  const pushByVendor = new Map(shops.map((shop) => { const settings = shop.settings && typeof shop.settings === "object" && !Array.isArray(shop.settings) ? shop.settings as Record<string, unknown> : {}; const preferences = settings.notificationPreferences && typeof settings.notificationPreferences === "object" && !Array.isArray(settings.notificationPreferences) ? settings.notificationPreferences as Record<string, unknown> : {}; const event = preferences.newOrder && typeof preferences.newOrder === "object" && !Array.isArray(preferences.newOrder) ? preferences.newOrder as Record<string, unknown> : {}; return [shop.vendorId, event.push !== false] as const; }));
  for (const item of packages) for (const userId of new Set(membersByVendor.get(item.vendorId) ?? [])) {
    const idempotencyKey = `vendor-order-placed:${order.id}:${item.vendorId}:${userId}`;
    const channels = [{ channel: "in_app", status: "DELIVERED" as const, deliveredAt: new Date() }, ...(pushByVendor.get(item.vendorId) !== false ? [{ channel: "push", status: "PENDING" as const }] : [])];
    const notification = await transaction.notification.upsert({ where: { idempotencyKey }, update: {}, create: { userId, type: "vendor.order.placed", title: `New seller order ${order.orderNumber}`, body: `${item.itemCount} product line${item.itemCount === 1 ? "" : "s"} worth BDT ${notificationMoney(item.totalMinor)} require fulfillment.`, data: { href: `/vendor/order/${item.id}`, orderId: order.id, vendorOrderId: item.id }, idempotencyKey, deliveries: { create: channels } }, include: { deliveries: true } });
    for (const delivery of notification.deliveries.filter((entry) => entry.status === "PENDING")) await transaction.outboxEvent.upsert({ where: { idempotencyKey: `notification-delivery:${delivery.id}` }, update: {}, create: { aggregateType: "notification_delivery", aggregateId: delivery.id, eventType: "notification.delivery.requested", idempotencyKey: `notification-delivery:${delivery.id}`, payload: { notificationDeliveryId: delivery.id } } });
  }
}

async function couponDiscount(database: CommerceDatabase, userId: string, code: string | null | undefined, subtotal: bigint) {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  const now = new Date();
  const coupon = await database.coupon.findUnique({ where: { code: normalized }, include: { _count: { select: { redemptions: true } } } });
  if (!coupon || !coupon.active || coupon.startsAt > now || coupon.endsAt <= now) throw new ApiProblem(400, "COUPON_INVALID", "This coupon is invalid or expired");
  if (subtotal < coupon.minimumSpendMinor) throw new ApiProblem(400, "COUPON_MINIMUM_SPEND", `Spend at least BDT ${(Number(coupon.minimumSpendMinor) / 100).toLocaleString("en-BD")} to use this coupon`);
  if (coupon.usageLimit !== null && coupon._count.redemptions >= coupon.usageLimit) throw new ApiProblem(409, "COUPON_LIMIT_REACHED", "This coupon has reached its usage limit");
  const userUses = await database.couponRedemption.count({ where: { couponId: coupon.id, userId } });
  if (userUses >= coupon.perUserLimit) throw new ApiProblem(409, "COUPON_USER_LIMIT_REACHED", "You have already used this coupon");
  let discount = coupon.discountType === "PERCENT" ? subtotal * BigInt(coupon.value) / 100n : BigInt(coupon.value);
  if (coupon.maxDiscountMinor !== null && discount > coupon.maxDiscountMinor) discount = coupon.maxDiscountMinor;
  if (discount > subtotal) discount = subtotal;
  if (discount <= 0n) throw new ApiProblem(400, "COUPON_INVALID", "This coupon does not apply to the current cart");
  return { sourceType: "coupon" as const, sourceId: coupon.id, coupon, discount, summary: { code: coupon.code, discountType: coupon.discountType as "PERCENT" | "FIXED", value: coupon.value, sourceType: "coupon" as const } };
}

async function voucherDiscount(database: CommerceDatabase, userId: string, code: string | null | undefined, cart: LoadedCart, subtotal: bigint) {
  if (!code) return null;
  const now = new Date(); const normalized = code.trim().toUpperCase();
  const voucher = await database.voucher.findUnique({ where: { code: normalized } });
  if (!voucher || !voucher.active || voucher.startsAt > now || voucher.endsAt <= now) return null;
  const rules = voucher.rules as { discountType?: "PERCENT" | "FIXED"; value?: number; minimumSpendMinor?: string; usageLimit?: number | null };
  if (!rules.discountType || !rules.value) throw new ApiProblem(400, "VOUCHER_INVALID", "This voucher has invalid discount rules");
  const eligibleSubtotal = voucher.ownerType === "vendor" ? cart.items.filter((item) => item.product.vendorId === voucher.ownerId).reduce((sum, item) => sum + item.variant.priceMinor * BigInt(item.quantity), 0n) : subtotal;
  if (eligibleSubtotal <= 0n) throw new ApiProblem(400, "VOUCHER_NOT_APPLICABLE", "This seller voucher does not apply to your current cart");
  if (eligibleSubtotal < BigInt(rules.minimumSpendMinor ?? 0)) throw new ApiProblem(400, "VOUCHER_MINIMUM_SPEND", "The eligible cart amount is below this voucher minimum");
  if (rules.usageLimit) { const uses = await database.orderAdjustment.count({ where: { sourceType: "voucher", sourceId: voucher.id } }); if (uses >= rules.usageLimit) throw new ApiProblem(409, "VOUCHER_LIMIT_REACHED", "This voucher has reached its usage limit"); }
  const userUses = await database.orderAdjustment.count({ where: { sourceType: "voucher", sourceId: voucher.id, order: { userId } } });
  if (userUses >= 1) throw new ApiProblem(409, "VOUCHER_USER_LIMIT_REACHED", "You have already used this voucher");
  let discount = rules.discountType === "PERCENT" ? eligibleSubtotal * BigInt(rules.value) / 100n : BigInt(rules.value);
  if (discount > eligibleSubtotal) discount = eligibleSubtotal;
  return { sourceType: "voucher" as const, sourceId: voucher.id, voucher, discount, summary: { code: voucher.code, discountType: rules.discountType, value: rules.value, sourceType: "voucher" as const } };
}

async function codeDiscount(database: CommerceDatabase, userId: string, code: string | null | undefined, cart: LoadedCart, subtotal: bigint) {
  if (!code) return null;
  const coupon = await couponDiscount(database, userId, code, subtotal).catch((error) => { if (error instanceof ApiProblem && error.code === "COUPON_INVALID") return null; throw error; });
  if (coupon) return coupon;
  const voucher = await voucherDiscount(database, userId, code, cart, subtotal);
  if (!voucher) throw new ApiProblem(400, "BENEFIT_CODE_INVALID", "This coupon or voucher is invalid or expired");
  return voucher;
}

type FlashPrice = { flashSaleId: string; priceMinor: bigint };
async function activeFlashPrices(database: CommerceDatabase, cart: LoadedCart) {
  const productIds = [...new Set(cart.items.map((item) => item.productId))]; if (!productIds.length) return new Map<string, FlashPrice>(); const now = new Date();
  const requested = new Map<string, number>(); for (const item of cart.items) requested.set(item.productId, (requested.get(item.productId) ?? 0) + item.quantity);
  const rows = await database.flashSaleProduct.findMany({ where: { productId: { in: productIds }, flashSale: { status: "active", startsAt: { lte: now }, endsAt: { gt: now } } }, include: { flashSale: true }, orderBy: [{ priceMinor: "asc" }, { flashSaleId: "asc" }] });
  const prices = new Map<string, FlashPrice>();
  for (const row of rows) { if (prices.has(row.productId) || (row.quantityLimit !== null && row.soldCount + (requested.get(row.productId) ?? 0) > row.quantityLimit)) continue; prices.set(row.productId, { flashSaleId: row.flashSaleId, priceMinor: row.priceMinor }); }
  return prices;
}

function itemPrice(item: LoadedCart["items"][number], flashPrices: Map<string, FlashPrice>) { const flash = flashPrices.get(item.productId); return flash && flash.priceMinor < item.variant.priceMinor ? flash.priceMinor : item.variant.priceMinor; }

function promotionCandidate(row: Prisma.PromotionGetPayload<{ include: { rules: true } }>): PromotionCandidate | null {
  const rule = row.rules.find((item) => item.ruleType === "ORDER_DISCOUNT");
  if (!rule) return null;
  const conditions = rule.conditions as { minimumSubtotalMinor?: string | number | bigint } | null;
  const effects = rule.effects as { type?: string; amountMinor?: string | number | bigint; rateBps?: number; maxDiscountMinor?: string | number | bigint | null } | null;
  if (!effects?.type) return null;
  if (effects.type === "FIXED") return { id: row.id, priority: row.priority, minimumSubtotalMinor: BigInt(conditions?.minimumSubtotalMinor ?? 0), effect: { type: "FIXED", amountMinor: BigInt(effects.amountMinor ?? 0) } };
  if (effects.type === "PERCENT") return { id: row.id, priority: row.priority, minimumSubtotalMinor: BigInt(conditions?.minimumSubtotalMinor ?? 0), effect: { type: "PERCENT", rateBps: Number(effects.rateBps ?? 0), maxDiscountMinor: effects.maxDiscountMinor === null || effects.maxDiscountMinor === undefined ? null : BigInt(effects.maxDiscountMinor) } };
  return null;
}

async function activePromotionCandidates(database: CommerceDatabase) {
  const now = new Date();
  const rows = await database.promotion.findMany({ where: { status: "active", startsAt: { lte: now }, endsAt: { gt: now } }, include: { rules: true }, orderBy: [{ priority: "desc" }, { id: "asc" }], take: 50 });
  return rows.map(promotionCandidate).filter((item): item is PromotionCandidate => Boolean(item));
}

function allocateDiscount(subtotals: bigint[], discount: bigint) {
  const total = subtotals.reduce((sum, value) => sum + value, 0n);
  let assigned = 0n;
  return subtotals.map((subtotal, index) => { const value = index === subtotals.length - 1 ? discount - assigned : discount * subtotal / total; assigned += value; return value; });
}

export function cartDto(cart: LoadedCart, flashPrices = new Map<string, FlashPrice>()) {
  const items = cart.items.map((item) => { const priceMinor = itemPrice(item, flashPrices); return { id: item.id, productId: item.productId, variantId: item.variantId, shopId: item.product.shop.id, shopName: item.product.shop.name, shopSlug: item.product.shop.slug, productName: item.product.name, variantTitle: item.variant.title, sku: item.variant.sku, thumbnailUrl: mediaUrl(item.variant.media[0]?.storageKey), quantity: item.quantity, unitPrice: money(priceMinor, item.variant.currency), lineTotal: money(priceMinor * BigInt(item.quantity), item.variant.currency), availableQuantity: Math.max(0, (item.variant.inventory?.onHand ?? 0) - (item.variant.inventory?.reserved ?? 0)) }; });
  const subtotal = items.reduce((sum, item) => sum + BigInt(item.lineTotal.amountMinor), 0n);
  return { id: cart.id, currency: cart.currency, items, subtotal: money(subtotal, cart.currency), itemCount: items.reduce((sum, item) => sum + item.quantity, 0), updatedAt: cart.updatedAt.toISOString() };
}

function orderDto(order: LoadedOrder) {
  return { id: order.id, orderNumber: order.orderNumber, status: order.status, subtotal: money(order.subtotalMinor, order.currency), discount: money(order.discountMinor, order.currency), delivery: money(order.deliveryMinor, order.currency), tax: money(order.taxMinor, order.currency), total: money(order.totalMinor, order.currency), fulfillmentMethod: order.fulfillmentMethod as "DELIVERY" | "PICKUP", pickupPoint: order.pickupPointSnapshot as { id: string; name: string; phone: string; address: string; division: string; district: string; upazila: string; unionName: string; instructions: string | null } | null, version: order.version, createdAt: order.createdAt.toISOString(), vendorOrders: order.vendorOrders.map((vendor) => ({ id: vendor.id, vendorId: vendor.vendorId, shopId: vendor.shopId, status: vendor.status, subtotal: money(vendor.subtotalMinor, order.currency), discount: money(vendor.discountMinor, order.currency), delivery: money(vendor.deliveryMinor, order.currency), total: money(vendor.totalMinor, order.currency), commission: money(vendor.commissionMinor, order.currency), version: vendor.version, items: vendor.items.map((item) => ({ id: item.id, productId: item.productId, variantId: item.variantId, productName: item.productNameSnapshot, sku: item.skuSnapshot, attributes: item.attributesSnapshot as Record<string, unknown> | null, quantity: item.quantity, unitPrice: money(item.unitPriceMinor, item.currency), discount: money(item.discountMinor, item.currency), lineTotal: money(item.lineTotalMinor, item.currency) })) })) };
}

export class CommerceService {
  private readonly outbox = new OutboxRepository();
  private readonly commissions: CommissionService;
  constructor(private readonly client: PrismaClient) { this.commissions = new CommissionService(client); }

  private async activeCart(userId: string) {
    const existing = await this.client.cart.findFirst({ where: { userId, status: "ACTIVE" }, include: cartInclude });
    if (existing) return existing;
    try { return await this.client.cart.create({ data: { userId }, include: cartInclude }); }
    catch { return this.client.cart.findFirstOrThrow({ where: { userId, status: "ACTIVE" }, include: cartInclude }); }
  }

  async cart(userId: string) { const cart = await this.activeCart(userId); return cartDto(cart, await activeFlashPrices(this.client, cart)); }

  async addItem(userId: string, variantId: string, quantity: number, idempotencyKey?: string) {
    const cart = await this.activeCart(userId);
    const scope = `cart-add:${userId}`;
    const requestHash = createHash("sha256").update(JSON.stringify({ variantId, quantity })).digest("hex");
    await withSerializableTransaction(this.client, async (transaction) => {
      if (idempotencyKey) {
        const previous = await transaction.idempotencyRecord.findUnique({ where: { scope_key: { scope, key: idempotencyKey } } });
        if (previous) {
          if (previous.requestHash !== requestHash) throw new ApiProblem(409, "IDEMPOTENCY_KEY_REUSED", "This cart request key belongs to different items");
          if (!previous.expiresAt || previous.expiresAt <= new Date()) throw new ApiProblem(409, "CART_REQUEST_EXPIRED", "Check your cart before starting a new request");
          return;
        }
      }
      if (!await transaction.cart.findFirst({ where: { id: cart.id, userId, status: "ACTIVE" }, select: { id: true } })) throw new ApiProblem(409, "CART_CHANGED", "Your cart changed. Refresh before adding items");
      const variant = await transaction.productVariant.findFirst({ where: { id: variantId, active: true, product: { status: "APPROVED", vendor: { status: "APPROVED" }, shop: { status: "ACTIVE" } } }, include: { product: true, inventory: true } });
      if (!variant?.inventory) throw new ApiProblem(404, "VARIANT_NOT_AVAILABLE", "This product variant is not available");
      const current = await transaction.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId } } });
      const requested = (current?.quantity ?? 0) + quantity;
      if (requested > variant.inventory.onHand - variant.inventory.reserved) throw new ApiProblem(409, "INSUFFICIENT_STOCK", "Requested quantity is not available");
      await transaction.cartItem.upsert({ where: { cartId_variantId: { cartId: cart.id, variantId } }, create: { cartId: cart.id, productId: variant.productId, variantId, quantity, displayPriceMinor: variant.priceMinor, currency: variant.currency }, update: { quantity: requested, displayPriceMinor: variant.priceMinor } });
      if (idempotencyKey) await transaction.idempotencyRecord.create({ data: { scope, key: idempotencyKey, requestHash, response: { cartId: cart.id }, expiresAt: new Date(Date.now() + 24 * 60 * 60_000) } });
    });
    return this.cart(userId);
  }

  async updateItem(userId: string, itemId: string, quantity: number) {
    const cart = await this.activeCart(userId); const item = await this.client.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, include: { variant: { include: { inventory: true } } } });
    if (!item) throw new ApiProblem(404, "CART_ITEM_NOT_FOUND", "Cart item not found");
    if (!item.variant.inventory || quantity > item.variant.inventory.onHand - item.variant.inventory.reserved) throw new ApiProblem(409, "INSUFFICIENT_STOCK", "Requested quantity is not available");
    await this.client.cartItem.update({ where: { id: itemId }, data: { quantity, displayPriceMinor: item.variant.priceMinor } }); return this.cart(userId);
  }

  async removeItem(userId: string, itemId: string) { const cart = await this.activeCart(userId); const result = await this.client.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } }); if (!result.count) throw new ApiProblem(404, "CART_ITEM_NOT_FOUND", "Cart item not found"); return this.cart(userId); }

  async quote(userId: string, input: CheckoutQuoteInput = {}) {
    const cart = await this.activeCart(userId); if (!cart.items.length) throw new ApiProblem(409, "CART_EMPTY", "Your cart is empty");
    for (const item of cart.items) if (!item.variant.inventory || item.quantity > item.variant.inventory.onHand - item.variant.inventory.reserved) throw new ApiProblem(409, "INSUFFICIENT_STOCK", `${item.product.name} is no longer available in that quantity`);
    const flashPrices = await activeFlashPrices(this.client, cart); const dto = cartDto(cart, flashPrices); const subtotal = BigInt(dto.subtotal.amountMinor); const vendors = new Set(cart.items.map((item) => item.product.vendorId)).size;
    let perVendorDelivery = BigInt(process.env.CHECKOUT_DELIVERY_FEE_MINOR || "6000");
    if (input.pickupPointId) {
      const [configuration, pickupPoint] = await Promise.all([this.client.platformConfiguration?.findUnique({ where: { key: "default" } }), this.client.pickupPoint.findFirst({ where: { id: input.pickupPointId, active: true } })]);
      const village = configuration?.villageOperations as { enabled?: boolean; pickupPointsEnabled?: boolean } | undefined;
      if (!village?.enabled || !village.pickupPointsEnabled) throw new ApiProblem(409, "PICKUP_POINTS_DISABLED", "Customer pickup is currently unavailable");
      if (!pickupPoint) throw new ApiProblem(404, "PICKUP_POINT_NOT_FOUND", "Pickup point is unavailable");
      perVendorDelivery = 0n;
    } else if (input.addressId || input.deliveryLocation) {
      const savedAddress = input.addressId ? await this.client.address.findFirst({ where: { id: input.addressId, userId } }) : null;
      if (input.addressId && !savedAddress) throw new ApiProblem(404, "ADDRESS_NOT_FOUND", "Delivery address not found");
      const address = savedAddress ? { division: savedAddress.division, district: savedAddress.district, upazila: savedAddress.upazila, unionName: savedAddress.unionName } : { division: input.deliveryLocation!.division, district: input.deliveryLocation!.district, upazila: input.deliveryLocation!.upazila, unionName: input.deliveryLocation!.union };
      const settings = await this.client.deliverySetting.upsert({ where: { key: "default" }, create: {}, update: {} });
      const same = (left: string | null, right: string) => (left ?? "").trim().localeCompare(right.trim(), undefined, { sensitivity: "accent" }) === 0;
      const zone = same(address.unionName, settings.baseUnion) && same(address.upazila, settings.baseUpazila) && same(address.district, settings.baseDistrict) ? "same_union" : same(address.upazila, settings.baseUpazila) && same(address.district, settings.baseDistrict) ? "same_upazila" : same(address.district, settings.baseDistrict) ? "same_district" : "outside_district";
      const enabled = zone === "same_union" ? settings.sameUnionEnabled : zone === "same_upazila" ? settings.sameUpazilaEnabled : zone === "same_district" ? settings.sameDistrictEnabled : settings.outsideDistrictEnabled;
      if (!enabled) throw new ApiProblem(409, "DELIVERY_AREA_UNAVAILABLE", "Delivery is currently unavailable for this area. Choose another address or contact support.");
      const zoneFee = zone === "same_union" ? settings.sameUnionFeeMinor : zone === "same_upazila" ? settings.sameUpazilaFeeMinor : zone === "same_district" ? settings.sameDistrictFeeMinor : settings.outsideDistrictFeeMinor;
      perVendorDelivery = settings.freeDeliveryEnabled && subtotal >= settings.freeDeliveryThresholdMinor ? 0n : zoneFee;
    }
    const delivery = perVendorDelivery * BigInt(vendors); const { rules } = await loadBusinessRules(this.client); const applied = await codeDiscount(this.client, userId, input.couponCode, cart, subtotal); const promotionCandidates = applied && !rules.promotions.allowCodeWithAutomatic ? [] : await activePromotionCandidates(this.client); const promotionPlan = stackedPromotionDiscount(subtotal, applied?.discount ?? 0n, promotionCandidates, rules.promotions.maximumStackedDiscountBps); const loyaltyAccount = await this.client.$transaction(async (transaction) => { await transaction.loyaltyAccount.upsert({ where: { userId }, create: { userId }, update: {} }); await expireLoyaltyBalance(transaction, userId); return transaction.loyaltyAccount.findUniqueOrThrow({ where: { userId } }); }); const redeemed = loyaltyRedemption(BigInt(input.loyaltyPoints ?? "0"), loyaltyAccount.pointsBalance, subtotal - promotionPlan.totalDiscountMinor + delivery, rules.loyalty); const discount = promotionPlan.totalDiscountMinor + redeemed.amountMinor; const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    return { cart: dto, subtotal: money(subtotal), discount: money(discount), delivery: money(delivery), tax: money(0n), total: money(subtotal - promotionPlan.totalDiscountMinor + delivery - redeemed.amountMinor), vendorCount: vendors, coupon: applied?.summary ?? null, automaticPromotion: promotionPlan.selectedPromotionId ? { id: promotionPlan.selectedPromotionId, amount: money(promotionPlan.automaticDiscountMinor) } : null, loyalty: { availablePoints: loyaltyAccount.pointsBalance.toString(), redeemedPoints: redeemed.points.toString(), discount: money(redeemed.amountMinor), policy: { enabled: rules.loyalty.enabled, minimumRedemptionPoints: rules.loyalty.minimumRedemptionPoints.toString(), maximumRedemptionBps: rules.loyalty.maximumRedemptionBps } }, expiresAt };
  }

  async checkout(session: Session, input: CheckoutInput, idempotencyKey: string): Promise<CheckoutResult> {
    const userId = session.principal.userId; const requestHash = createHash("sha256").update(JSON.stringify(input)).digest("hex"); const configuration = await this.client.platformConfiguration?.findUnique({ where: { key: "default" } }); const maintenance = configuration?.maintenanceMode as { enabled?: boolean; message?: string } | undefined; const methods = configuration?.paymentMethods as { cod?: { enabled?: boolean }; sslcommerz?: { enabled?: boolean } } | undefined; const village = configuration?.villageOperations as { enabled?: boolean; requireCodPhoneConfirmation?: boolean; requireUnionForDelivery?: boolean; ruralDeliveryEnabled?: boolean; pickupPointsEnabled?: boolean } | undefined; const paymentEnabled = input.paymentMethod === "COD" ? methods?.cod?.enabled !== false : input.paymentMethod === "SSLCOMMERZ" ? methods?.sslcommerz?.enabled !== false : false; if (maintenance?.enabled) throw new ApiProblem(503, "PLATFORM_MAINTENANCE", maintenance.message || "Checkout is temporarily unavailable"); if (!paymentEnabled) throw new ApiProblem(409, "PAYMENT_METHOD_DISABLED", `${input.paymentMethod} is not currently available`); if (input.pickupPointId && (!village?.enabled || !village.pickupPointsEnabled)) throw new ApiProblem(409, "PICKUP_POINTS_DISABLED", "Customer pickup is currently unavailable"); if (village?.enabled && input.paymentMethod === "COD" && village.requireCodPhoneConfirmation && !input.codPhoneConfirmed) throw new ApiProblem(400, "COD_PHONE_CONFIRMATION_REQUIRED", "Confirm that the delivery phone number is active before placing a cash-on-delivery order");
    return withSerializableTransaction(this.client, async (transaction) => {
      const previous = await transaction.idempotencyRecord.findUnique({ where: { scope_key: { scope: `checkout:${userId}`, key: idempotencyKey } } });
      if (previous) { if (previous.requestHash !== requestHash) throw new ApiProblem(409, "IDEMPOTENCY_KEY_REUSED", "Idempotency key was used for different checkout data"); return previous.response as CheckoutResult; }
      const [address, pickupPoint] = await Promise.all([transaction.address.findFirst({ where: { id: input.addressId, userId } }), input.pickupPointId ? transaction.pickupPoint.findFirst({ where: { id: input.pickupPointId, active: true } }) : Promise.resolve(null)]); if (!address) throw new ApiProblem(404, "ADDRESS_NOT_FOUND", "Customer contact address not found"); if (input.pickupPointId && !pickupPoint) throw new ApiProblem(404, "PICKUP_POINT_NOT_FOUND", "Pickup point is unavailable"); if (!pickupPoint && village?.enabled && village.requireUnionForDelivery && (!address.unionName?.trim() || !address.upazila?.trim())) throw new ApiProblem(400, "RURAL_ADDRESS_INCOMPLETE", "Select an upazila and union for village delivery"); if (!pickupPoint && village?.enabled && village.ruralDeliveryEnabled === false && address.unionName?.trim()) throw new ApiProblem(409, "RURAL_DELIVERY_DISABLED", "Village and union delivery is temporarily paused");
      const initial = await transaction.cart.findFirst({ where: { userId, status: "ACTIVE" }, include: { items: { select: { variant: { select: { inventory: { select: { id: true } } } } } } } }); if (!initial?.items.length) throw new ApiProblem(409, "CART_EMPTY", "Your cart is empty");
      for (const item of initial.items) if (item.variant.inventory) await transaction.$queryRaw`SELECT id FROM inventory_items WHERE id = ${item.variant.inventory.id}::uuid FOR UPDATE`;
      const cart = await transaction.cart.findUniqueOrThrow({ where: { id: initial.id }, include: cartInclude });
      const groups = new Map<string, typeof cart.items>(); for (const item of cart.items) { const available = (item.variant.inventory?.onHand ?? 0) - (item.variant.inventory?.reserved ?? 0); if (!item.variant.inventory || item.quantity > available || item.product.status !== "APPROVED" || item.product.shop.status !== "ACTIVE") throw new ApiProblem(409, "CHECKOUT_ITEM_UNAVAILABLE", `${item.product.name} is unavailable`); if (shopVacationActive(item.product.shop.settings)) throw new ApiProblem(409, "SHOP_VACATION_ACTIVE", `${item.product.shop.name} is temporarily not accepting new orders`); const rows = groups.get(item.product.vendorId) ?? []; rows.push(item); groups.set(item.product.vendorId, rows); }
      if (input.couponCode) { await transaction.$queryRaw`SELECT id FROM coupons WHERE code = ${input.couponCode} FOR UPDATE`; await transaction.$queryRaw`SELECT id FROM vouchers WHERE code = ${input.couponCode} FOR UPDATE`; }
      const flashPrices = await activeFlashPrices(transaction, cart); const subtotal = cart.items.reduce((sum, item) => sum + itemPrice(item, flashPrices) * BigInt(item.quantity), 0n); const { rules } = await loadBusinessRules(transaction); const applied = await codeDiscount(transaction, userId, input.couponCode, cart, subtotal); const promotionCandidates = applied && !rules.promotions.allowCodeWithAutomatic ? [] : await activePromotionCandidates(transaction); const promotionPlan = stackedPromotionDiscount(subtotal, applied?.discount ?? 0n, promotionCandidates, rules.promotions.maximumStackedDiscountBps);
      const deliverySettings = await transaction.deliverySetting.upsert({ where: { key: "default" }, create: {}, update: {} });
      const same = (left: string | null, right: string) => (left ?? "").trim().localeCompare(right.trim(), undefined, { sensitivity: "accent" }) === 0;
      const deliveryZone = same(address.unionName, deliverySettings.baseUnion) && same(address.upazila, deliverySettings.baseUpazila) && same(address.district, deliverySettings.baseDistrict) ? "same_union" : same(address.upazila, deliverySettings.baseUpazila) && same(address.district, deliverySettings.baseDistrict) ? "same_upazila" : same(address.district, deliverySettings.baseDistrict) ? "same_district" : "outside_district";
      const zoneEnabled = deliveryZone === "same_union" ? deliverySettings.sameUnionEnabled : deliveryZone === "same_upazila" ? deliverySettings.sameUpazilaEnabled : deliveryZone === "same_district" ? deliverySettings.sameDistrictEnabled : deliverySettings.outsideDistrictEnabled;
      if (!pickupPoint && !zoneEnabled) throw new ApiProblem(409, "DELIVERY_AREA_UNAVAILABLE", "Delivery is currently unavailable for this area. Choose another address or contact support.");
      const zoneFee = deliveryZone === "same_union" ? deliverySettings.sameUnionFeeMinor : deliveryZone === "same_upazila" ? deliverySettings.sameUpazilaFeeMinor : deliveryZone === "same_district" ? deliverySettings.sameDistrictFeeMinor : deliverySettings.outsideDistrictFeeMinor;
      const deliveryFee = pickupPoint ? 0n : deliverySettings.freeDeliveryEnabled && subtotal >= deliverySettings.freeDeliveryThresholdMinor ? 0n : zoneFee;
      const delivery = deliveryFee * BigInt(groups.size); await transaction.loyaltyAccount.upsert({ where: { userId }, create: { userId }, update: {} }); await expireLoyaltyBalance(transaction, userId); const loyaltyAccount = await transaction.loyaltyAccount.findUniqueOrThrow({ where: { userId } }); const redeemed = loyaltyRedemption(BigInt(input.loyaltyPoints ?? "0"), loyaltyAccount.pointsBalance, subtotal - promotionPlan.totalDiscountMinor + delivery, rules.loyalty); const discount = promotionPlan.totalDiscountMinor + redeemed.amountMinor; const total = subtotal - promotionPlan.totalDiscountMinor + delivery - redeemed.amountMinor; const confirmed = input.paymentMethod === "COD";
      const pickupSnapshot = pickupPoint ? json({ id: pickupPoint.id, name: pickupPoint.name, phone: pickupPoint.phone, address: pickupPoint.address, division: pickupPoint.division, district: pickupPoint.district, upazila: pickupPoint.upazila, unionName: pickupPoint.unionName, instructions: pickupPoint.instructions }) : Prisma.DbNull;
      const order = await transaction.order.create({ data: { orderNumber: `AGO-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`, userId, status: confirmed ? "CONFIRMED" : "PENDING_PAYMENT", subtotalMinor: subtotal, discountMinor: discount, deliveryMinor: delivery, totalMinor: total, openBoxAllowed: deliverySettings.openBoxEnabled, inspectionMinutes: deliverySettings.openBoxEnabled ? deliverySettings.inspectionMinutes : 0, fulfillmentMethod: pickupPoint ? "PICKUP" : "DELIVERY", pickupPointSnapshot: pickupSnapshot, placedAt: new Date(), addresses: { create: { type: "delivery", recipientName: address.recipientName, phone: address.phone, line1: address.line1, line2: address.line2, division: address.division, district: address.district, upazila: address.upazila, unionName: address.unionName, postalCode: address.postalCode } } } });
      const groupEntries = [...groups.entries()]; const vendorSubtotals = groupEntries.map(([, items]) => items.reduce((sum, item) => sum + itemPrice(item, flashPrices) * BigInt(item.quantity), 0n)); const vendorDiscounts = allocateDiscount(vendorSubtotals, promotionPlan.totalDiscountMinor); const vendorPackages: Array<{ id: string; vendorId: string; itemCount: number; totalMinor: bigint }> = [];
      for (const [groupIndex, [vendorId, items]] of groupEntries.entries()) {
        const vendorSubtotal = vendorSubtotals[groupIndex]!;
        const vendorDiscount = vendorDiscounts[groupIndex]!;
        const commissionMinor = await this.commissions.calculateForVendorOrder(transaction, order.id, vendorId, items.map((item) => ({ productId: item.productId, shopId: item.product.shopId, categoryId: item.product.categoryId, quantity: item.quantity, unitPriceMinor: itemPrice(item, flashPrices) })));
        const vendorOrder = await transaction.vendorOrder.create({ data: { orderId: order.id, vendorId, shopId: items[0]!.product.shopId, subtotalMinor: vendorSubtotal, discountMinor: vendorDiscount, deliveryMinor: deliveryFee, totalMinor: vendorSubtotal - vendorDiscount + deliveryFee, commissionMinor } });
        vendorPackages.push({ id: vendorOrder.id, vendorId, itemCount: items.length, totalMinor: vendorOrder.totalMinor });
        for (const item of items) {
          const effectivePrice = itemPrice(item, flashPrices); await transaction.orderItem.create({ data: { orderId: order.id, vendorOrderId: vendorOrder.id, productId: item.productId, variantId: item.variantId, productNameSnapshot: item.product.name, skuSnapshot: item.variant.sku, attributesSnapshot: item.variant.attributes ?? Prisma.JsonNull, quantity: item.quantity, unitPriceMinor: effectivePrice, lineTotalMinor: effectivePrice * BigInt(item.quantity), currency: item.variant.currency } });
          await transaction.inventoryItem.update({ where: { id: item.variant.inventory!.id }, data: confirmed ? { onHand: { decrement: item.quantity }, version: { increment: 1 }, movements: { create: { type: "SALE", quantity: -item.quantity, referenceType: "order", referenceId: order.id, idempotencyKey: `checkout-sale:${order.id}:${item.variantId}` } } } : { reserved: { increment: item.quantity }, version: { increment: 1 }, movements: { create: { type: "RESERVATION", quantity: item.quantity, referenceType: "order", referenceId: order.id, idempotencyKey: `checkout-reservation:${order.id}:${item.variantId}` } } } });
          await transaction.inventoryReservation.create({ data: { variantId: item.variantId, orderId: order.id, quantity: item.quantity, status: confirmed ? "CONSUMED" : "ACTIVE", expiresAt: new Date(Date.now() + rules.inventory.reservationMinutes * 60_000) } });
        }
      }
      if (applied && promotionPlan.couponDiscountMinor > 0n) { if (applied.sourceType === "coupon") await transaction.couponRedemption.create({ data: { couponId: applied.sourceId, userId, orderId: order.id, amountMinor: promotionPlan.couponDiscountMinor } }); await transaction.orderAdjustment.create({ data: { orderId: order.id, type: "DISCOUNT", label: `${applied.sourceType === "coupon" ? "Coupon" : "Voucher"} ${applied.summary.code}`, amountMinor: -promotionPlan.couponDiscountMinor, sourceType: applied.sourceType, sourceId: applied.sourceId, metadata: json(applied.summary) } }); }
      if (promotionPlan.selectedPromotionId && promotionPlan.automaticDiscountMinor > 0n) await transaction.orderAdjustment.create({ data: { orderId: order.id, type: "DISCOUNT", label: "Automatic marketplace promotion", amountMinor: -promotionPlan.automaticDiscountMinor, sourceType: "promotion", sourceId: promotionPlan.selectedPromotionId } });
      if (redeemed.points > 0n) { const changed = await transaction.loyaltyAccount.updateMany({ where: { id: loyaltyAccount.id, version: loyaltyAccount.version, pointsBalance: { gte: redeemed.points } }, data: { pointsBalance: { decrement: redeemed.points }, version: { increment: 1 } } }); if (!changed.count) throw new ApiProblem(409, "LOYALTY_BALANCE_CHANGED", "Your loyalty balance changed; refresh checkout and try again"); await transaction.loyaltyTransaction.create({ data: { accountId: loyaltyAccount.id, points: -redeemed.points, entryType: "ORDER_REDEMPTION", referenceType: "order", referenceId: order.id, idempotencyKey: `loyalty-redeem:${order.id}` } }); await transaction.orderAdjustment.create({ data: { orderId: order.id, type: "LOYALTY_CREDIT", label: `${redeemed.points.toString()} Amiyo reward points`, amountMinor: -redeemed.amountMinor, sourceType: "loyalty", sourceId: loyaltyAccount.id } }); }
      const flashQuantities = new Map<string, number>(); for (const item of cart.items) if (flashPrices.has(item.productId)) flashQuantities.set(item.productId, (flashQuantities.get(item.productId) ?? 0) + item.quantity); for (const [productId, quantity] of flashQuantities) { const flash = flashPrices.get(productId)!; const currentFlash = await transaction.flashSaleProduct.findUniqueOrThrow({ where: { flashSaleId_productId: { flashSaleId: flash.flashSaleId, productId } } }); if (currentFlash.quantityLimit !== null && currentFlash.soldCount + quantity > currentFlash.quantityLimit) throw new ApiProblem(409, "FLASH_SALE_SOLD_OUT", "A flash-sale item sold out while you were checking out"); await transaction.flashSaleProduct.update({ where: { flashSaleId_productId: { flashSaleId: flash.flashSaleId, productId } }, data: { soldCount: { increment: quantity } } }); }
      const provider = input.paymentMethod === "COD" ? "cod" : input.paymentMethod.toLowerCase(); const payment = await transaction.payment.create({ data: { orderId: order.id, provider, method: input.paymentMethod, status: confirmed ? "AUTHORIZED" : "REQUIRES_ACTION", amountMinor: total, attempts: { create: { attemptNumber: 1, status: confirmed ? "authorized" : "requires_action", requestSnapshot: { method: input.paymentMethod } } } } });
      const invoice = await transaction.invoice.create({ data: { orderId: order.id, number: `INV-${order.orderNumber}` } }); await transaction.cart.update({ where: { id: cart.id }, data: { status: "CONVERTED" } }); await transaction.orderStatusEvent.create({ data: { orderId: order.id, toStatus: order.status, actorType: "customer", actorId: userId } }); await notifyOrderAdmins(transaction, order); await notifyOrderVendors(transaction, order, vendorPackages); await this.outbox.enqueue(transaction, { aggregateType: "order", aggregateId: order.id, eventType: "order.placed", idempotencyKey: `order-placed:${order.id}`, payload: { orderId: order.id, paymentMethod: input.paymentMethod } });
      const loadedOrder = await transaction.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude }); const result: CheckoutResult = { order: orderDto(loadedOrder), payment: { id: payment.id, orderId: payment.orderId, provider: payment.provider, method: payment.method, status: payment.status, amount: money(payment.amountMinor), refunded: money(payment.refundedMinor), version: payment.version, createdAt: payment.createdAt.toISOString() }, invoiceNumber: invoice.number, actionUrl: confirmed ? null : `${process.env.API_PUBLIC_URL || "http://localhost:4000"}/sandbox/payments/${payment.id}`, instructions: confirmed ? "Pay cash when your order is delivered." : `Complete the ${input.paymentMethod} sandbox payment.` };
      await transaction.idempotencyRecord.create({ data: { scope: `checkout:${userId}`, key: idempotencyKey, requestHash, response: result as unknown as Prisma.InputJsonValue, expiresAt: new Date(Date.now() + 24 * 60 * 60_000) } }); return result;
    });
  }
}
