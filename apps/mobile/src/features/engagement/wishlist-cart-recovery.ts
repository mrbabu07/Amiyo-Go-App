import { z } from "zod";

const receiptSchema = z.object({
  version: z.literal(1),
  createdAt: z.number().int().nonnegative(),
  productIds: z.array(z.string().uuid()).min(1),
  keys: z.record(z.string().uuid(), z.string().uuid()),
  completed: z.boolean()
});
export type WishlistCartReceipt = z.infer<typeof receiptSchema>;
export const wishlistCartRecoveryMs = 23 * 60 * 60_000;

export function createWishlistCartRecovery(
  storage: { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> },
  storageKey: (uid: string, collectionId: string) => Promise<string>,
  createKey: () => string,
  now = Date.now
) {
  const busy = new Set<string>();
  async function exclusive<Result>(uid: string, collectionId: string, operation: () => Promise<Result>) {
    const scope = JSON.stringify([uid, collectionId]);
    if (busy.has(scope)) throw new Error("This wishlist recovery record is already being updated.");
    busy.add(scope);
    try { return await operation(); } finally { busy.delete(scope); }
  }
  async function load(uid: string, collectionId: string): Promise<WishlistCartReceipt | null> {
    const raw = await storage.getItem(await storageKey(uid, collectionId));
    if (raw === null) return null;
    try { return receiptSchema.parse(JSON.parse(raw)); }
    catch { throw new Error("Saved wishlist-to-cart progress is unreadable. Review your cart before continuing."); }
  }
  const normalize = (productIds: string[]) => [...new Set(productIds)];
  const matches = (receipt: WishlistCartReceipt, productIds: string[]) => JSON.stringify(receipt.productIds) === JSON.stringify(normalize(productIds));
  const create = (productIds: string[]): WishlistCartReceipt => {
    const normalized = normalize(productIds);
    return receiptSchema.parse({ version: 1, createdAt: now(), productIds: normalized, keys: Object.fromEntries(normalized.map((id) => [id, createKey()])), completed: false });
  };
  return {
    load,
    async prepare(uid: string, collectionId: string, productIds: string[]) {
      return exclusive(uid, collectionId, async () => {
        const previous = await load(uid, collectionId);
        if (previous) {
          if (!matches(previous, productIds)) throw new Error("Your saved list changed during wishlist-to-cart. Review your cart before starting again.");
          if (!previous.completed && (now() < previous.createdAt || now() - previous.createdAt >= wishlistCartRecoveryMs)) throw new Error("Wishlist-to-cart recovery expired. Review your cart before starting again.");
          return previous;
        }
        const receipt = create(productIds);
        await storage.setItem(await storageKey(uid, collectionId), JSON.stringify(receipt));
        return receipt;
      });
    },
    async complete(uid: string, collectionId: string, productIds: string[]) {
      return exclusive(uid, collectionId, async () => {
        const previous = await load(uid, collectionId);
        if (!previous || !matches(previous, productIds)) throw new Error("Saved wishlist-to-cart progress changed. Review your cart.");
        const receipt = receiptSchema.parse({ ...previous, completed: true });
        await storage.setItem(await storageKey(uid, collectionId), JSON.stringify(receipt));
        return receipt;
      });
    },
    async restartCompleted(uid: string, collectionId: string, productIds: string[]) {
      return exclusive(uid, collectionId, async () => {
        const previous = await load(uid, collectionId);
        if (!previous?.completed || !matches(previous, productIds)) throw new Error("Only a confirmed wishlist copy can be started again.");
        const receipt = create(productIds);
        await storage.setItem(await storageKey(uid, collectionId), JSON.stringify(receipt));
        return receipt;
      });
    }
  };
}
