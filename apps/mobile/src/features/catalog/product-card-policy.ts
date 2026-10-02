export function productDiscount(price: number, originalPrice?: number) {
  if (!Number.isFinite(price) || price < 0 || !originalPrice || !Number.isFinite(originalPrice) || originalPrice <= price) return 0;
  return Math.round((1 - price / originalPrice) * 100);
}

export function quickCartVariant(variants: { id: string; active: boolean; availableQuantity: number }[]) {
  const active = variants.filter((variant) => variant.active);
  if (!active.some((variant) => variant.availableQuantity > 0)) throw new Error("Currently out of stock");
  return active.length === 1 ? active[0]!.id : null;
}
