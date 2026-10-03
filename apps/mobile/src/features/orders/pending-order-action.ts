import { cancelOrderSchema, createReturnSchema } from "@amiyo/contracts";
import { z } from "zod";

export const orderCommandSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("cancel"), input: cancelOrderSchema }),
  z.object({ kind: z.literal("return"), input: createReturnSchema })
]);
export type OrderCommand = z.infer<typeof orderCommandSchema>;
const pendingSchema = z.object({ version: z.literal(1), key: z.string().uuid(), createdAt: z.number().int().nonnegative(), command: orderCommandSchema });
export type PendingOrderAction = z.infer<typeof pendingSchema>;
export const orderRecoveryWindowMs = 23 * 60 * 60_000;
const rejectedBeforeWrite = new Set(["VALIDATION_ERROR", "ORDER_NOT_FOUND", "ORDER_VERSION_CONFLICT", "ORDER_CANCELLATION_WINDOW_EXPIRED", "ORDER_CANCELLATION_NOT_ALLOWED", "RETURN_NOT_ELIGIBLE", "RETURN_ITEM_INVALID", "RETURN_QUANTITY_EXCEEDED"]);
export const mayDiscardOrderRejection = (fresh: boolean, status: number, code: string) => fresh && [400, 404, 409].includes(status) && rejectedBeforeWrite.has(code);
export function assertOrderRecoveryTime(record: PendingOrderAction, now: number) {
  if (now < record.createdAt || now - record.createdAt >= orderRecoveryWindowMs) throw new Error("Request recovery expired. Check orders/returns and contact support before submitting again.");
}

export function createPendingOrderActionStore(storage: { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> }, storageKey: (uid: string, orderId: string) => Promise<string>, now = Date.now) {
  const busy = new Set<string>();
  async function exclusive<Result>(uid: string, orderId: string, operation: () => Promise<Result>) {
    const scope = JSON.stringify([uid, orderId]);
    if (busy.has(scope)) throw new Error("Another order request is being saved. Retry shortly.");
    busy.add(scope);
    try { return await operation(); } finally { busy.delete(scope); }
  }
  async function load(uid: string, orderId: string): Promise<PendingOrderAction | null> {
    const raw = await storage.getItem(await storageKey(uid, orderId));
    if (raw === null) return null;
    try { return pendingSchema.parse(JSON.parse(raw)); }
    catch { throw new Error("Saved order request is unreadable. Check orders/returns and contact support before submitting again."); }
  }
  return {
    load,
    async prepare(uid: string, orderId: string, command: OrderCommand, key: string) {
      return exclusive(uid, orderId, async () => {
      const normalized = orderCommandSchema.parse(command);
      const saved = await load(uid, orderId);
      if (saved) {
        assertOrderRecoveryTime(saved, now());
        if (JSON.stringify(saved.command) !== JSON.stringify(normalized)) throw new Error("Recover the original saved request before changing its details.");
        return { ...saved, fresh: false };
      }
      const pending = pendingSchema.parse({ version: 1, key, createdAt: now(), command: normalized });
      await storage.setItem(await storageKey(uid, orderId), JSON.stringify(pending));
      return { ...pending, fresh: true };
      });
    },
    async complete(uid: string, orderId: string, key: string) {
      return exclusive(uid, orderId, async () => {
      const saved = await load(uid, orderId);
      if (saved?.key === key) await storage.removeItem(await storageKey(uid, orderId));
      });
    }
  };
}
