import { z } from "zod";

const payloadSchema = z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(99) });
const recordSchema = z.object({ version: z.literal(1), key: z.string().uuid(), createdAt: z.number().int().nonnegative(), payload: payloadSchema, completed: z.boolean() });
export type ReorderReceipt = z.infer<typeof recordSchema>;
export const reorderRecoveryMs = 23 * 60 * 60_000;

export function createReorderRecovery(storage: { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }, storageKey: (uid: string, itemId: string) => Promise<string>, now = Date.now) {
  const busy = new Set<string>();
  async function exclusive<Result>(uid: string, itemId: string, operation: () => Promise<Result>) {
    const scope = JSON.stringify([uid, itemId]);
    if (busy.has(scope)) throw new Error("This reorder is already being saved.");
    busy.add(scope);
    try { return await operation(); } finally { busy.delete(scope); }
  }
  async function load(uid: string, itemId: string): Promise<ReorderReceipt | null> {
    const raw = await storage.getItem(await storageKey(uid, itemId));
    if (raw === null) return null;
    try { return recordSchema.parse(JSON.parse(raw)); }
    catch { throw new Error("Saved reorder is unreadable. Check your cart before continuing."); }
  }
  return {
    load,
    async restartCompleted(uid: string, itemId: string, expectedKey: string, key: string) {
      return exclusive(uid, itemId, async () => {
        const previous = await load(uid, itemId);
        if (!previous?.completed || previous.key !== expectedKey || key === expectedKey) throw new Error("Only the confirmed previous reorder can be started again.");
        const next = recordSchema.parse({ ...previous, key, createdAt: now(), completed: false });
        await storage.setItem(await storageKey(uid, itemId), JSON.stringify(next));
        return next;
      });
    },
    async prepare(uid: string, itemId: string, payload: ReorderReceipt["payload"], key: string) {
      return exclusive(uid, itemId, async () => {
        const normalized = payloadSchema.parse(payload);
        const previous = await load(uid, itemId);
        if (previous) {
          if (JSON.stringify(previous.payload) !== JSON.stringify(normalized)) throw new Error("Recover the original reorder before changing its quantity or variant.");
          if (!previous.completed && (now() < previous.createdAt || now() - previous.createdAt >= reorderRecoveryMs)) throw new Error("Reorder recovery expired. Check your cart; do not automatically add again.");
          return previous;
        }
        const record = recordSchema.parse({ version: 1, key, createdAt: now(), payload: normalized, completed: false });
        await storage.setItem(await storageKey(uid, itemId), JSON.stringify(record));
        return record;
      });
    },
    async complete(uid: string, itemId: string, key: string) {
      return exclusive(uid, itemId, async () => {
        const previous = await load(uid, itemId);
        if (!previous || previous.key !== key) throw new Error("Saved reorder changed. Check your cart.");
        await storage.setItem(await storageKey(uid, itemId), JSON.stringify({ ...previous, completed: true }));
      });
    }
  };
}
