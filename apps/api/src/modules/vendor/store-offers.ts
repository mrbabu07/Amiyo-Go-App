import type { Voucher, VendorShop } from "@prisma/client";

type OfferRules = {
  discountType?: "PERCENT" | "FIXED";
  value?: number;
  shopId?: string;
  title?: string;
  subtitle?: string | null;
  bannerStorageKey?: string | null;
  ctaLabel?: string;
  showOnHome?: boolean;
  showOnShop?: boolean;
  showAsPopup?: boolean;
};

function mediaUrl(key: string | null | undefined) {
  if (!key) return null;
  if (/^https?:\/\//.test(key)) return key;
  const base = process.env.OBJECT_STORAGE_PUBLIC_URL?.replace(/\/$/, "");
  return base ? `${base}/${key}` : null;
}

export function publicStoreOffer(voucher: Voucher, shop: Pick<VendorShop, "id" | "name" | "slug">) {
  const rules = voucher.rules && typeof voucher.rules === "object" && !Array.isArray(voucher.rules) ? voucher.rules as OfferRules : {};
  if (!rules.discountType || !Number.isInteger(rules.value) || Number(rules.value) <= 0 || rules.shopId !== shop.id || !rules.title) return null;
  return {
    id: voucher.id,
    shopId: shop.id,
    shopName: shop.name,
    shopSlug: shop.slug,
    code: voucher.code,
    title: rules.title,
    subtitle: rules.subtitle ?? null,
    imageUrl: mediaUrl(rules.bannerStorageKey),
    ctaLabel: rules.ctaLabel || "Shop offer",
    href: `/shop/${shop.slug}`,
    discountType: rules.discountType,
    value: Number(rules.value),
    showOnHome: rules.showOnHome !== false,
    showOnShop: rules.showOnShop !== false,
    showAsPopup: rules.showAsPopup !== false,
    startsAt: voucher.startsAt.toISOString(),
    endsAt: voucher.endsAt.toISOString()
  };
}
