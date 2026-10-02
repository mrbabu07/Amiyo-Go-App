import { checkoutInputSchema, type CheckoutInput } from "@amiyo/contracts";
import { z } from "zod";

const pendingSchema = z.object({ version: z.literal(1), key: z.string().uuid(), createdAt: z.number().int().nonnegative(), input: checkoutInputSchema });
export type PendingCheckout = z.infer<typeof pendingSchema>;
export const recoveryWindowMs = 23 * 60 * 60_000;
const rejectedBeforeOrder = new Set(["ADDRESS_NOT_FOUND", "RURAL_ADDRESS_INCOMPLETE", "RURAL_DELIVERY_DISABLED", "COD_PHONE_CONFIRMATION_REQUIRED", "PAYMENT_METHOD_DISABLED", "CART_EMPTY", "CHECKOUT_ITEM_UNAVAILABLE", "INSUFFICIENT_STOCK", "LOYALTY_BALANCE_CHANGED", "FLASH_SALE_SOLD_OUT", "COUPON_INVALID", "COUPON_MINIMUM_SPEND", "COUPON_LIMIT_REACHED", "COUPON_USER_LIMIT_REACHED", "VOUCHER_INVALID", "VOUCHER_NOT_APPLICABLE", "VOUCHER_MINIMUM_SPEND", "VOUCHER_LIMIT_REACHED", "VOUCHER_USER_LIMIT_REACHED", "BENEFIT_CODE_INVALID"]);
export const mayDiscardRejectedCheckout = (fresh: boolean, status: number, code: string) => fresh && [400, 404, 409].includes(status) && rejectedBeforeOrder.has(code);

export function createPendingCheckoutStore(storage: {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}, storageKey: (uid: string) => Promise<string>, now = Date.now) {
  async function load(uid: string): Promise<PendingCheckout | null> {
    const raw = await storage.getItem(await storageKey(uid));
    if (raw === null) return null;
    try { return pendingSchema.parse(JSON.parse(raw)); }
    catch { throw new Error("Saved checkout could not be read. Check your orders and contact support before trying again."); }
  }
  return {
    load,
    async prepare(uid: string, input: CheckoutInput, key: string) {
      const normalized = checkoutInputSchema.parse(input);
      const saved = await load(uid);
      if (saved) {
        if (now() < saved.createdAt || now() - saved.createdAt >= recoveryWindowMs) throw new Error("Checkout recovery has expired. Check your orders and contact support before placing another order.");
        if (JSON.stringify(saved.input) !== JSON.stringify(normalized)) throw new Error("An earlier checkout needs recovery. Reopen checkout to retry the original order first.");
        return { ...saved, fresh: false };
      }
      const pending = pendingSchema.parse({ version: 1, key, createdAt: now(), input: normalized });
      await storage.setItem(await storageKey(uid), JSON.stringify(pending));
      return { ...pending, fresh: true };
    },
    async complete(uid: string, key: string) {
      const saved = await load(uid);
      if (saved?.key === key) await storage.removeItem(await storageKey(uid));
    }
  };
}
