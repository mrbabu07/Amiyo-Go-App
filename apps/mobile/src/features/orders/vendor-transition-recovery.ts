import { vendorOrderTransitionSchema } from "@amiyo/contracts";
import { z } from "zod";

const recordSchema = z.object({ key: z.string().uuid(), createdAt: z.number().int(), input: vendorOrderTransitionSchema });
export function createVendorTransitionRecovery(storage: { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> }, now = Date.now) {
  const locks = new Set<string>();
  const scope = (uid: string, id: string) => `amiyo.vendor-transition.v1.${encodeURIComponent(JSON.stringify([uid, id]))}`;
  async function load(uid: string, id: string) {
    const raw = await storage.getItem(scope(uid, id));
    if (raw === null) return null;
    const saved = recordSchema.parse(JSON.parse(raw));
    if (now() < saved.createdAt || now() - saved.createdAt >= 23 * 60 * 60_000) throw new Error("Saved action expired. Ask operations to reconcile before another update.");
    return saved;
  }
  return { load, async run<Result>(uid: string, id: string, input: z.infer<typeof vendorOrderTransitionSchema>, key: string, send: (input: z.infer<typeof vendorOrderTransitionSchema>, key: string) => Promise<Result>, discard?: (error: unknown, fresh: boolean) => boolean) {
    const identity = scope(uid, id);
    if (locks.has(identity)) throw new Error("This package update is already running.");
    locks.add(identity);
    try {
      const saved = await load(uid, id);
      if (saved && saved.input.status !== input.status) throw new Error(`Recover ${saved.input.status} before starting another action.`);
      const pending = saved ?? recordSchema.parse({ key, input, createdAt: now() });
      if (!saved) await storage.setItem(identity, JSON.stringify(pending));
      try {
        const result = await send(pending.input, pending.key);
        await storage.removeItem(identity);
        return result;
      } catch (error) {
        if (discard?.(error, !saved)) await storage.removeItem(identity);
        throw error;
      }
    } finally { locks.delete(identity); }
  } };
}
