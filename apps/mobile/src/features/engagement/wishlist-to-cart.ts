export type WishlistCartProduct = { productId: string; slug: string; name: string };
type Variant = { id: string; active: boolean; availableQuantity: number };
export type WishlistCartOutcome = WishlistCartProduct & { status: "added" | "choose-options" | "out-of-stock" | "unavailable" | "unconfirmed" | "not-attempted" };
export type WishlistCartResult = { items: WishlistCartOutcome[]; accountChanged: boolean };
type Dependencies = {
  isCurrentAccount: () => boolean;
  loadProduct: (identifier: string) => Promise<{ variants: Variant[] }>;
  addVariant: (id: string) => Promise<void>;
};
const activeAccounts = new Set<string>();

export async function wishlistToCart(uid: string, products: WishlistCartProduct[], dependencies: Dependencies): Promise<WishlistCartResult> {
  if (activeAccounts.has(uid)) throw new Error("A wishlist-to-cart operation is already running. Check your cart before trying again.");
  activeAccounts.add(uid);
  const items: WishlistCartOutcome[] = [];
  let accountChanged = false;
  let stopped = false;
  try {
    const seen = new Set<string>();
    for (const product of products) {
      if (seen.has(product.productId)) continue;
      seen.add(product.productId);
      if (!dependencies.isCurrentAccount()) { accountChanged = true; stopped = true; }
      if (stopped) { items.push({ ...product, status: "not-attempted" }); continue; }
      let variants: Variant[];
      try {
        variants = (await dependencies.loadProduct(product.slug || product.productId)).variants.filter((variant) => variant.active);
      } catch {
        items.push({ ...product, status: "unavailable" });
        continue;
      }
      if (!dependencies.isCurrentAccount()) {
        accountChanged = true; stopped = true;
        items.push({ ...product, status: "not-attempted" });
        continue;
      }
      if (!variants.some((variant) => variant.availableQuantity > 0)) {
        items.push({ ...product, status: "out-of-stock" });
        continue;
      }
      if (variants.length !== 1) {
        items.push({ ...product, status: "choose-options" });
        continue;
      }
      try {
        await dependencies.addVariant(variants[0]!.id);
        items.push({ ...product, status: "added" });
      } catch {
        items.push({ ...product, status: "unconfirmed" });
        stopped = true;
      }
    }
    return { items, accountChanged };
  } finally {
    activeAccounts.delete(uid);
  }
}
