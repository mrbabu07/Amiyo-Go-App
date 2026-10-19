import { createPayoutRequestSchema, type CreatePayoutRequest } from "@amiyo/contracts";
import { z } from "zod";

const pendingSchema = z.object({ version: z.literal(1), key: z.string().uuid(), createdAt: z.number().int().nonnegative(), input: createPayoutRequestSchema });
export const payoutRecoveryWindowMs = 23 * 60 * 60_000;
const definiteRejections = new Set(["PAYOUT_ACCOUNT_UNVERIFIED", "PAYOUT_BELOW_MINIMUM", "PAYOUT_BALANCE_INSUFFICIENT"]);
export const mayDiscardRejectedPayout = (fresh: boolean, status: number, code: string) => fresh && status === 409 && definiteRejections.has(code);

export function createPendingVendorPayoutStore(storage: {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}, storageKey: (uid: string) => Promise<string>, now = Date.now) {
  async function load(uid: string) {
    const raw = await storage.getItem(await storageKey(uid));
    if (raw === null) return null;
    try { return pendingSchema.parse(JSON.parse(raw)); }
    catch { throw new Error("Saved payout recovery could not be read. Check payout history and contact finance before trying again."); }
  }

  return {
    load,
    async prepare(uid: string, input: CreatePayoutRequest, key: string) {
      const normalized = createPayoutRequestSchema.parse(input);
      const saved = await load(uid);
      if (saved) {
        if (now() < saved.createdAt || now() - saved.createdAt >= payoutRecoveryWindowMs) throw new Error("Payout recovery expired. Check payout history and contact finance before submitting again.");
        if (JSON.stringify(saved.input) !== JSON.stringify(normalized)) throw new Error("An earlier payout needs recovery. Retry its original amount and destination first.");
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
