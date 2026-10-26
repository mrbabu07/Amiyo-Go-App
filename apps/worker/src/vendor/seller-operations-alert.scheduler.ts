import { Prisma, type PrismaClient } from "@prisma/client";

type SellerAlertEvent = "campaignAlert" | "lowStock" | "shipmentDue";

export function sellerAlertPushEnabled(settings: Prisma.JsonValue | null | undefined, event: SellerAlertEvent) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return true;
  const preferences = (settings as Record<string, unknown>).notificationPreferences;
  if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) return true;
  const channel = (preferences as Record<string, unknown>)[event];
  return !channel || typeof channel !== "object" || Array.isArray(channel) || (channel as Record<string, unknown>).push !== false;
}

export function shipmentAlertDue(createdAt: Date, now: Date, warningHours = 18) {
  return createdAt.getTime() <= now.getTime() - warningHours * 60 * 60_000;
}

export function sellerOrderAlertHours(settings: Prisma.JsonValue | null | undefined) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return 18;
  const operations = (settings as Record<string, unknown>).operations;
  if (!operations || typeof operations !== "object" || Array.isArray(operations)) return 18;
  const value = (operations as Record<string, unknown>).sellerOrderAlertHours;
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 168 ? value : 18;
}

export class SellerOperationsAlertScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(private readonly client: PrismaClient, private readonly onError: (error: unknown) => void) {}

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => void this.poll(), 5 * 60_000);
    void this.poll();
  }

  async stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    while (this.running) await new Promise((resolve) => setTimeout(resolve, 25));
  }

  private async notify(transaction: Prisma.TransactionClient, input: { vendorId: string; settings: Prisma.JsonValue | null; event: SellerAlertEvent; type: string; title: string; body: string; href: string; key: string }) {
    const members = await transaction.vendorMember.findMany({ where: { vendorId: input.vendorId, status: "active", user: { status: "ACTIVE" } }, select: { userId: true } });
    for (const userId of new Set(members.map((member) => member.userId))) {
      const idempotencyKey = `${input.key}:${userId}`;
      const push = sellerAlertPushEnabled(input.settings, input.event);
      const notification = await transaction.notification.upsert({ where: { idempotencyKey }, update: {}, create: { userId, type: input.type, title: input.title, body: input.body, data: { href: input.href }, idempotencyKey, deliveries: { create: [{ channel: "in_app", status: "DELIVERED", deliveredAt: new Date() }, ...(push ? [{ channel: "push", status: "PENDING" as const }] : [])] } }, include: { deliveries: true } });
      for (const delivery of notification.deliveries.filter((item) => item.status === "PENDING")) await transaction.outboxEvent.upsert({ where: { idempotencyKey: `notification-delivery:${delivery.id}` }, update: {}, create: { aggregateType: "notification_delivery", aggregateId: delivery.id, eventType: "notification.delivery.requested", idempotencyKey: `notification-delivery:${delivery.id}`, payload: { notificationDeliveryId: delivery.id } } });
    }
  }

  async deliverLowStock(inventoryId: string) {
    return this.client.$transaction(async (transaction) => {
      const item = await transaction.inventoryItem.findFirst({ where: { id: inventoryId, reorderLevel: { gt: 0 }, variant: { active: true, product: { status: "APPROVED", vendor: { status: "APPROVED" }, shop: { status: "ACTIVE" } } } }, include: { variant: { include: { product: { include: { shop: true } } } } } });
      if (!item || item.onHand - item.reserved > item.reorderLevel) return false;
      const product = item.variant.product;
      await this.notify(transaction, { vendorId: product.vendorId, settings: product.shop.settings, event: "lowStock", type: "vendor.inventory.low_stock", title: "Low stock needs attention", body: `${product.name} (${item.variant.sku}) has ${Math.max(0, item.onHand - item.reserved)} available; reorder level is ${item.reorderLevel}.`, href: "/vendor/inventory", key: `vendor-low-stock:${item.id}:${item.version}` });
      return true;
    });
  }

  async deliverShipmentDue(vendorOrderId: string, now = new Date(), warningHours = 18) {
    return this.client.$transaction(async (transaction) => {
      const order = await transaction.vendorOrder.findFirst({ where: { id: vendorOrderId, status: { in: ["PLACED", "ACCEPTED", "PROCESSING"] } }, include: { order: { select: { orderNumber: true } }, shop: true } });
      if (!order || !shipmentAlertDue(order.createdAt, now, warningHours)) return false;
      await this.notify(transaction, { vendorId: order.vendorId, settings: order.shop.settings, event: "shipmentDue", type: "vendor.shipment.due", title: `Shipment due for ${order.order.orderNumber}`, body: `This package has been awaiting fulfillment for at least ${warningHours} hours. Pack it and arrange manual delivery as soon as possible.`, href: `/vendor/order/${order.id}`, key: `vendor-shipment-due:${order.id}:${order.updatedAt.toISOString()}` });
      return true;
    });
  }

  async deliverCampaign(campaignId: string, now = new Date()) {
    return this.client.$transaction(async (transaction) => {
      const campaign = await transaction.campaign.findFirst({ where: { id: campaignId, status: "active", endsAt: { gt: now } }, include: { products: { include: { product: { include: { shop: true } } } } } });
      if (!campaign) return false;
      const byVendor = new Map<string, { names: string[]; settings: Prisma.JsonValue | null }>();
      for (const row of campaign.products) {
        const current = byVendor.get(row.product.vendorId) ?? { names: [], settings: row.product.shop.settings };
        current.names.push(row.product.name);
        byVendor.set(row.product.vendorId, current);
      }
      for (const [vendorId, products] of byVendor) await this.notify(transaction, { vendorId, settings: products.settings, event: "campaignAlert", type: "vendor.campaign.eligible", title: `Campaign opportunity: ${campaign.name}`, body: `${products.names.length} of your products ${campaign.startsAt > now ? "are selected for an upcoming campaign" : "are live in this campaign"}. Review pricing and stock before ${campaign.endsAt.toLocaleDateString("en-BD")}.`, href: "/vendor/marketing/campaigns", key: `vendor-campaign:${campaign.id}:${campaign.version}:${vendorId}` });
      return byVendor.size > 0;
    });
  }

  async poll(now = new Date()) {
    if (this.running) return;
    this.running = true;
    try {
      const [businessRules, inventory, campaigns] = await Promise.all([
        this.client.platformConfiguration.findUnique({ where: { key: "business-rules" }, select: { featureFlags: true } }),
        this.client.inventoryItem.findMany({ where: { reorderLevel: { gt: 0 }, variant: { active: true, product: { status: "APPROVED", vendor: { status: "APPROVED" }, shop: { status: "ACTIVE" } } } }, select: { id: true, onHand: true, reserved: true, reorderLevel: true }, orderBy: { updatedAt: "asc" }, take: 100 }),
        this.client.campaign.findMany({ where: { status: "active", startsAt: { lte: new Date(now.getTime() + 24 * 60 * 60_000) }, endsAt: { gt: now }, products: { some: {} } }, select: { id: true }, orderBy: { startsAt: "asc" }, take: 100 })
      ]);
      const warningHours = sellerOrderAlertHours(businessRules?.featureFlags);
      const orders = await this.client.vendorOrder.findMany({ where: { status: { in: ["PLACED", "ACCEPTED", "PROCESSING"] }, createdAt: { lte: new Date(now.getTime() - warningHours * 60 * 60_000) } }, select: { id: true }, orderBy: { createdAt: "asc" }, take: 100 });
      for (const item of inventory.filter((entry) => entry.onHand - entry.reserved <= entry.reorderLevel)) try { await this.deliverLowStock(item.id); } catch (error) { this.onError(error); }
      for (const order of orders) try { await this.deliverShipmentDue(order.id, now, warningHours); } catch (error) { this.onError(error); }
      for (const campaign of campaigns) try { await this.deliverCampaign(campaign.id, now); } catch (error) { this.onError(error); }
    } catch (error) { this.onError(error); } finally { this.running = false; }
  }
}
