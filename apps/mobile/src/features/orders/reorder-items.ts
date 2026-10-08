import type { ReorderReceipt } from "./reorder-recovery";
export type ReorderItem = { id: string; productId: string; variantId: string; quantity: number; productName: string };
type Variant = { id: string; active: boolean; availableQuantity: number };
export type ReorderOutcome = ReorderItem & { status: "added" | "previously-added" | "unavailable" | "insufficient-stock" | "unconfirmed" | "not-attempted" };
type Dependencies = { isCurrentAccount(): boolean; loadProduct(id: string): Promise<{ variants: Variant[] }>; addVariant(id: string, quantity: number, key?: string): Promise<void>; recovery?: { load(item: ReorderItem): Promise<ReorderReceipt | null>; prepare(item: ReorderItem): Promise<ReorderReceipt>; complete(item: ReorderItem, key: string): Promise<void> } };
const activeAccounts = new Set<string>();

export async function reorderItems(uid: string, items: ReorderItem[], dependencies: Dependencies): Promise<ReorderOutcome[]> {
  if (activeAccounts.has(uid)) throw new Error("Another reorder is running. Check your cart before trying again.");
  activeAccounts.add(uid);
  const results: ReorderOutcome[] = [];
  const seen = new Set<string>();
  let stopped = false;
  try {
    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      if (stopped || !dependencies.isCurrentAccount()) { stopped = true; results.push({ ...item, status: "not-attempted" }); continue; }
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) { results.push({ ...item, status: "unavailable" }); continue; }
      try {
        if (await dependencies.recovery?.load(item)) {
          const saved = await dependencies.recovery!.prepare(item);
          if (!dependencies.isCurrentAccount()) { stopped = true; results.push({ ...item, status: "not-attempted" }); continue; }
          if (saved.completed) { results.push({ ...item, status: "previously-added" }); continue; }
          await dependencies.addVariant(saved.payload.variantId, saved.payload.quantity, saved.key);
          await dependencies.recovery!.complete(item, saved.key);
          results.push({ ...item, status: "added" });
          continue;
        }
      } catch { results.push({ ...item, status: "unconfirmed" }); stopped = true; continue; }
      let variant: Variant | undefined;
      try { variant = (await dependencies.loadProduct(item.productId)).variants.find((entry) => entry.id === item.variantId && entry.active); }
      catch { results.push({ ...item, status: "unavailable" }); continue; }
      if (!dependencies.isCurrentAccount()) { stopped = true; results.push({ ...item, status: "not-attempted" }); continue; }
      if (!variant) { results.push({ ...item, status: "unavailable" }); continue; }
      if (variant.availableQuantity < item.quantity) { results.push({ ...item, status: "insufficient-stock" }); continue; }
      try {
        const saved = await dependencies.recovery?.prepare(item);
        if (!dependencies.isCurrentAccount()) { stopped = true; results.push({ ...item, status: "not-attempted" }); continue; }
        if (saved?.completed) { results.push({ ...item, status: "previously-added" }); continue; }
        await dependencies.addVariant(variant.id, item.quantity, saved?.key);
        if (saved) await dependencies.recovery!.complete(item, saved.key);
        results.push({ ...item, status: "added" });
      }
      catch { results.push({ ...item, status: "unconfirmed" }); stopped = true; }
    }
    return results;
  } finally { activeAccounts.delete(uid); }
}
