import { createHmac } from "node:crypto";
import { z } from "zod";

const snapshotSchema = z.object({
  orderId: z.string().uuid(), orderNumber: z.string(), vendorOrderId: z.string().uuid(),
  customer: z.object({ name: z.string(), phone: z.string(), address: z.string(), division: z.string(), district: z.string(), upazila: z.string(), union: z.string() }),
  pickup: z.object({ name: z.string(), phone: z.string(), address: z.string(), division: z.string(), district: z.string(), upazila: z.string(), union: z.string() }),
  items: z.array(z.object({ productId: z.string().uuid(), title: z.string(), sku: z.string(), quantity: z.number().int().positive(), unitPriceMinor: z.string(), totalPriceMinor: z.string() })),
  paymentType: z.enum(["cod", "prepaid"]), codAmountMinor: z.string(), deliveryFeeMinor: z.string(), currency: z.string(), readyForPickup: z.literal(true), dispatchRequested: z.literal(true)
});

export type DeliveryCreateResult = { externalOrderId: string; trackingNumber: string | null; response: unknown };

export function signDeliveryRequest(rawBody: string, timestamp: string, secret: string) {
  return `sha256=${createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")}`;
}

function firstText(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) { const value = source[key]; if (typeof value === "string" && value) return value; }
  return null;
}

export class AmiyoDeliveryClient {
  constructor(private readonly config: { apiUrl: string; integrationToken: string; signingSecret: string; timeoutMs: number }) {}

  async createDelivery(snapshot: unknown, idempotencyKey: string): Promise<DeliveryCreateResult> {
    if (!this.config.apiUrl || !this.config.integrationToken || !this.config.signingSecret) throw new Error("Amiyo Delivery integration is not configured");
    const request = snapshotSchema.parse(snapshot);
    const body = JSON.stringify({ ...request, source: "amiyo_go", syncMode: "ready_to_ship", marketplaceStatus: "ready_to_ship", fulfillmentStatus: "ready_to_ship", pickupRequest: { requestedAt: new Date().toISOString(), reason: "ready_to_ship", source: "vendor_order" } });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await fetch(`${this.config.apiUrl.replace(/\/$/, "")}/api/integrations/amiyo/orders`, { method: "POST", signal: controller.signal, headers: { Accept: "application/json", "Content-Type": "application/json", "Idempotency-Key": idempotencyKey, "x-api-key": this.config.integrationToken, "x-amiyo-timestamp": timestamp, "x-amiyo-signature": signDeliveryRequest(body, timestamp, this.config.signingSecret) }, body });
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (!response.ok) throw new Error(typeof payload.message === "string" ? payload.message : `Amiyo Delivery returned ${response.status}`);
      const nested = payload.data && typeof payload.data === "object" && !Array.isArray(payload.data) ? payload.data as Record<string, unknown> : payload;
      const externalOrderId = firstText(payload, ["deliveryOrderId", "delivery_order_id", "id"]) || firstText(nested, ["deliveryOrderId", "delivery_order_id", "id", "_id"]);
      if (!externalOrderId) throw new Error("Amiyo Delivery response did not include an external order ID");
      const trackingNumber = firstText(payload, ["trackingId", "trackingNumber", "tracking_number"]) || firstText(nested, ["trackingId", "trackingNumber", "tracking_number"]);
      return { externalOrderId, trackingNumber, response: payload };
    } finally { clearTimeout(timeout); }
  }
}
