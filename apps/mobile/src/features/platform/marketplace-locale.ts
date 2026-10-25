import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../auth/auth.store";
import { getPublicPlatformSettings } from "./platform.api";

export type MarketplaceLocale = "en" | "bn";

export const marketplaceCopy = {
  en: { home: "Home", categories: "Categories", wishlist: "Wishlist", cart: "Cart", orders: "Orders", account: "Account", addCart: "Add to cart", adding: "Adding…", dataSaver: "Low-data mode is saving images and bandwidth.", fullMode: "Full shopping experience is active.", useFull: "Use full mode", saveData: "Save data", callOrder: "Call to order", villageTitle: "Easy shopping from your village", fastVillage: "Fast village marketplace", fastVillageCopy: "Products, prices and orders stay available without marketplace image downloads.", offline: "You are offline. Saved screens remain available; updates will resume after reconnecting." },
  bn: { home: "হোম", categories: "ক্যাটাগরি", wishlist: "পছন্দ", cart: "কার্ট", orders: "অর্ডার", account: "অ্যাকাউন্ট", addCart: "কার্টে যোগ করুন", adding: "যোগ হচ্ছে…", dataSaver: "ডাটা সেভার ছবি ও ইন্টারনেট খরচ কমাচ্ছে।", fullMode: "সম্পূর্ণ শপিং মোড চালু আছে।", useFull: "পূর্ণ মোড", saveData: "ডাটা সেভ করুন", callOrder: "ফোনে অর্ডার", villageTitle: "গ্রাম থেকেও সহজে কেনাকাটা", fastVillage: "দ্রুত গ্রামের বাজার", fastVillageCopy: "ছবি ডাউনলোড ছাড়াই পণ্য, দাম ও অর্ডার ব্যবহার করুন।", offline: "ইন্টারনেট সংযোগ নেই। সংরক্ষিত পেজ দেখা যাবে; সংযোগ ফিরলে আপডেট আবার শুরু হবে।" }
} as const;

export function resolveMarketplaceLocale(sessionLocale?: string | null, defaultLocale?: string | null): MarketplaceLocale {
  return sessionLocale === "bn" || (!sessionLocale && defaultLocale === "bn") ? "bn" : "en";
}

export function useMarketplaceLocale() {
  const sessionLocale = useAuthStore((state) => state.session?.profile.locale);
  const platform = useQuery({ queryKey: ["platform", "public-settings"], queryFn: getPublicPlatformSettings, staleTime: 5 * 60_000 });
  const locale = resolveMarketplaceLocale(sessionLocale, platform.data?.villageOperations.defaultLocale);
  return { locale, t: marketplaceCopy[locale] };
}
