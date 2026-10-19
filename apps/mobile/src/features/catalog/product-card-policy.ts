import { percentageDiscount } from "../../ui/money";

export function productDiscount(priceMinor: string, originalPriceMinor?: string) {
  if (!/^\d+$/.test(priceMinor) || !originalPriceMinor || !/^\d+$/.test(originalPriceMinor)) return 0;
  return percentageDiscount(priceMinor, originalPriceMinor);
}

export function quickCartVariant(variants: { id: string; active: boolean; availableQuantity: number }[]) {
  const active = variants.filter((variant) => variant.active);
  if (!active.some((variant) => variant.availableQuantity > 0)) throw new Error("Currently out of stock");
  return active.length === 1 ? active[0]!.id : null;
}
