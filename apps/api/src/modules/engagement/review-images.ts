export function reviewImages(media: Array<{ id: string; storageKey: string; mimeType: string }>, ownerId: string, base = process.env.OBJECT_STORAGE_PUBLIC_URL) {
  if (!base) return [];
  let origin: URL;
  try { origin = new URL(`${base.replace(/\/$/, "")}/`); } catch { return []; }
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.search || origin.hash) return [];
  return media.filter((item) => ["image/jpeg", "image/png", "image/webp"].includes(item.mimeType) && item.storageKey.startsWith(`public/review/${ownerId}/`) && /^public\/review\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|png|webp)$/i.test(item.storageKey)).slice(0, 5).map((item) => ({ id: item.id, url: new URL(item.storageKey, origin).href }));
}
