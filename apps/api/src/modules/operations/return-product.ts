import type { Prisma } from "@prisma/client";

export const returnProductSelect = {
  productNameSnapshot: true,
  skuSnapshot: true,
  attributesSnapshot: true,
  product: { select: { media: { orderBy: { displayOrder: "asc" }, take: 1, select: { storageKey: true } } } }
} satisfies Prisma.OrderItemSelect;

type ProductSnapshot = Prisma.OrderItemGetPayload<{ select: typeof returnProductSelect }>;
export function returnProductDetails(item: ProductSnapshot) {
  const key = item.product?.media[0]?.storageKey;
  const base = process.env.OBJECT_STORAGE_PUBLIC_URL?.replace(/\/$/, "");
  const thumbnailUrl = !key ? null : /^https?:\/\//.test(key) ? key : base ? `${base}/${key.replace(/^\//, "")}` : null;
  return { productName: item.productNameSnapshot, sku: item.skuSnapshot, attributes: item.attributesSnapshot as Record<string, unknown> | null, thumbnailUrl };
}
