import { z } from "zod";
import { sellerBulkActions, type SellerBulkAction } from "./vendor-bulk-actions";

export const vendorBatchRecoveryWindowMs = 23 * 60 * 60_000;
const actionSchema = z.enum(Object.keys(sellerBulkActions) as [SellerBulkAction, ...SellerBulkAction[]]);
const recordSchema = z.object({ action: actionSchema, ids: z.array(z.string().uuid()).min(1).max(20), completedIds: z.array(z.string().uuid()).max(20), createdAt: z.number().int() }).superRefine((record, context) => {
  if (new Set(record.ids).size !== record.ids.length) context.addIssue({ code: "custom", message: "Duplicate package IDs are not allowed." });
  if (new Set(record.completedIds).size !== record.completedIds.length) context.addIssue({ code: "custom", message: "Duplicate completed package IDs are not allowed." });
  if (record.completedIds.some((id) => !record.ids.includes(id))) context.addIssue({ code: "custom", message: "Completed packages must belong to the saved plan." });
});
type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> };

export function createVendorBatchRecovery(storage: Storage, now = Date.now) {
  const scope = (uid: string) => `amiyo.vendor-batch.v1.${encodeURIComponent(uid)}`;
  async function load(uid: string) {
    const raw = await storage.getItem(scope(uid));
    if (raw === null) return null;
    const saved = recordSchema.parse(JSON.parse(raw));
    if (now() < saved.createdAt || now() - saved.createdAt >= vendorBatchRecoveryWindowMs) throw new Error("Saved batch expired. Review seller orders before starting another batch.");
    return saved;
  }
  return {
    load,
    async start(uid: string, action: SellerBulkAction, ids: string[]) {
      if (await load(uid)) throw new Error("Finish or discard the saved seller batch first.");
      const record = recordSchema.parse({ action, ids, completedIds: [], createdAt: now() });
      await storage.setItem(scope(uid), JSON.stringify(record));
      return record;
    },
    async complete(uid: string, id: string) {
      const saved = await load(uid);
      if (!saved) throw new Error("Saved seller batch is missing.");
      if (!saved.ids.includes(id)) throw new Error("Package does not belong to the saved seller batch.");
      if (saved.completedIds.includes(id)) return saved;
      const next = recordSchema.parse({ ...saved, completedIds: [...saved.completedIds, id] });
      await storage.setItem(scope(uid), JSON.stringify(next));
      return next;
    },
    async clear(uid: string) { await storage.removeItem(scope(uid)); }
  };
}
