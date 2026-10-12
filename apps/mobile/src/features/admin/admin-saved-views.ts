import { z } from "zod";

export type AdminSavedView = z.infer<typeof savedViewSchema>;
type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };

const selectionSchema = z.union([
  z.object({ range: z.enum(["7d", "30d", "90d"]) }),
  z.object({ range: z.literal("custom"), startsAt: z.string().datetime(), endsAt: z.string().datetime() }).refine((value) => {
    const startsAt = new Date(value.startsAt); const endsAt = new Date(value.endsAt);
    return startsAt < endsAt && endsAt.getTime() - startsAt.getTime() <= 366 * 86_400_000;
  }, "Saved custom report dates are invalid")
]);
const savedViewSchema = z.object({ id: z.string().min(1).max(100), name: z.string().trim().min(1).max(50), selection: selectionSchema, createdAt: z.string().datetime() });
const savedViewsSchema = z.array(savedViewSchema).max(10);

export function createAdminSavedViews(storage: Storage, keyFor: (uid: string) => Promise<string>, createId: () => string, now: () => Date = () => new Date()) {
  async function load(uid: string) {
    const raw = await storage.getItem(await keyFor(uid));
    if (!raw) return [];
    return savedViewsSchema.parse(JSON.parse(raw));
  }
  return {
    load,
    async save(uid: string, name: string, selection: AdminSavedView["selection"]) {
      const current = await load(uid); const normalized = name.trim();
      if (current.some((view) => view.name.toLocaleLowerCase() === normalized.toLocaleLowerCase())) throw new Error("A saved view already uses this name.");
      if (current.length >= 10) throw new Error("You can keep up to 10 saved admin views.");
      const next = savedViewsSchema.parse([...current, { id: createId(), name: normalized, selection, createdAt: now().toISOString() }]);
      await storage.setItem(await keyFor(uid), JSON.stringify(next)); return next;
    },
    async remove(uid: string, id: string) {
      const current = await load(uid); const next = current.filter((view) => view.id !== id);
      await storage.setItem(await keyFor(uid), JSON.stringify(next)); return next;
    }
  };
}
