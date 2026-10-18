import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import type { HomeCategory, HomeProduct } from "./home.data";
import { BottomNav } from "./components/BottomNav";
import { CategoryRail } from "./components/CategoryRail";
import { DeliveryAvailability } from "./components/DeliveryAvailability";
import { FlashSaleCountdown } from "./components/FlashSaleCountdown";
import { HeroBanner } from "./components/HeroBanner";
import { HomeSectionTitle } from "./components/HomeSectionTitle";
import { NewsletterSignup } from "./components/NewsletterSignup";
import { ProductCard } from "./components/ProductCard";
import { PromoTiles } from "./components/PromoTiles";
import { ShopRail } from "./components/ShopRail";
import { StoreHeader } from "./components/StoreHeader";
import { StoreFooter } from "./components/StoreFooter";
import { getCategoryNavigation, getProducts, getShops } from "../catalog/catalog.api";
import { getCategoryVisual } from "../catalog/category-visuals";
import { toHomeProduct } from "../catalog/catalog.view-model";
import { getDiscoverySessionId, getRecommendations } from "../catalog/discovery.api";
import { getGrowthFeed } from "../engagement/engagement.api";
import { getPublicPlatformSettings } from "../platform/platform.api";

function ProductGrid({ columns, lowData, products }: { columns: number; lowData: boolean; products: HomeProduct[] }) {
  const cardWidth = `${100 / columns}%` as `${number}%`;
  return (
    <View style={styles.grid}>
      {products.map((product) => <View key={product.id} style={[styles.cardSlot, { width: cardWidth }]}><ProductCard lowData={lowData} product={product} /></View>)}
    </View>
  );
}

const benefits = [
  { icon: "shield-checkmark-outline", title: "Secure payment", text: "Protected checkout" },
  { icon: "car-outline", title: "Fast delivery", text: "Across Bangladesh" },
  { icon: "refresh-outline", title: "Easy returns", text: "Simple return policy" },
  { icon: "headset-outline", title: "24/7 support", text: "Always here to help" }
];
const quickDeals = [
  { icon: "flash-outline", title: "Flash Deals", href: "/search" },
  { icon: "ticket-outline", title: "Vouchers", href: "/cart" },
  { icon: "storefront-outline", title: "Official Stores", href: "/shops" },
  { icon: "sparkles-outline", title: "New Arrivals", href: "/products" }
];

export function CustomerHomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const compact = width < 620;
  const columns = width >= 1180 ? 5 : width >= 820 ? 4 : width < 360 ? 1 : 2;
  const contentWidth = Math.min(width, 1208);
  const platformQuery = useQuery({ queryKey: ["platform", "public-settings"], queryFn: getPublicPlatformSettings, staleTime: 5 * 60_000 });
  const village = platformQuery.data?.villageOperations;
  const [lowDataOverride, setLowDataOverride] = useState<boolean | null>(null);
  const [discoverySessionId, setDiscoverySessionId] = useState("");
  useEffect(() => { void AsyncStorage.getItem("amiyo:low-data-mode").then((value) => { if (value !== null) setLowDataOverride(value === "true"); }); }, []);
  useEffect(() => { void getDiscoverySessionId().then(setDiscoverySessionId); }, []);
  const lowData = village?.enabled ? lowDataOverride ?? village.lowDataModeDefault : false;
  async function toggleLowData() { if (!village?.allowCustomerLowDataOverride) return; const next = !lowData; setLowDataOverride(next); await AsyncStorage.setItem("amiyo:low-data-mode", String(next)); }
  const categoryQuery = useQuery({ queryKey: ["catalog", "category-navigation"], queryFn: getCategoryNavigation, staleTime: 5 * 60_000 });
  const productQuery = useQuery({ queryKey: ["catalog", "home-products", lowData], queryFn: () => getProducts({ limit: lowData ? 12 : 20 }) });
  const shopQuery = useQuery({ queryKey: ["catalog", "home-shops"], queryFn: getShops });
  const growthQuery = useQuery({ queryKey: ["growth", "feed"], queryFn: getGrowthFeed });
  const recommendationQuery = useQuery({ queryKey: ["catalog", "recommendations", discoverySessionId], queryFn: () => getRecommendations(discoverySessionId), enabled: Boolean(discoverySessionId), staleTime: 30_000, retry: 1 });
  const liveCategories: HomeCategory[] = (categoryQuery.data || []).filter((category) => category.parentId === null).map((category, index) => { const visual = getCategoryVisual(category, index); return { id: category.slug, name: category.name, icon: visual.icon, color: visual.background, foreground: visual.foreground }; });
  const liveProducts = (productQuery.data?.data || []).map(toHomeProduct);
  const recommendedProducts = (recommendationQuery.data?.data || []).map(toHomeProduct);
  const activeFlashSale = growthQuery.data?.flashSales[0];
  const heroBanner = growthQuery.data?.banners.find((banner) => banner.placement === "home_hero");
  const flashPriceByProduct = new Map(activeFlashSale?.products.map((product) => [product.productId, Number(product.price.amountMinor) / 100]) || []);
  const flashProducts = liveProducts.filter((product) => flashPriceByProduct.has(product.id)).map((product) => ({ ...product, originalPrice: product.price, price: flashPriceByProduct.get(product.id) ?? product.price }));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <StoreHeader desktop={desktop} viewportWidth={width} />
          <View style={[styles.content, compact && responsive.contentCompact, { width: contentWidth }]}>
            {village?.enabled ? <View style={[styles.villageBar, compact && responsive.villageBarCompact]}><View style={[styles.villageCopy, compact && responsive.villageCopyCompact]}><Text style={styles.villageTitle}>{village.defaultLocale === "bn" ? "গ্রাম থেকেও সহজে কেনাকাটা" : "Easy shopping from your village"}</Text><Text style={styles.villageText}>{lowData ? "Low-data mode is saving images and bandwidth." : "Full shopping experience is active."}</Text></View>{village.allowCustomerLowDataOverride ? <Pressable onPress={() => void toggleLowData()} style={[styles.dataButton, compact && responsive.actionCompact]}><Ionicons color={colors.surface} name={lowData ? "speedometer-outline" : "images-outline"} size={16} /><Text style={styles.dataButtonText}>{lowData ? "Use full mode" : "Save data"}</Text></Pressable> : null}{village.assistedOrderingEnabled && village.supportPhone ? <Pressable onPress={() => void Linking.openURL(`tel:${village.supportPhone}`)} style={[styles.helpButton, compact && responsive.actionCompact]}><Ionicons color={colors.primary} name="call-outline" size={16} /><Text style={styles.helpButtonText}>Call to order</Text></Pressable> : null}</View> : null}
            {lowData ? <View style={styles.lowDataHero}><Ionicons color={colors.accent} name="leaf-outline" size={28} /><View style={styles.villageCopy}><Text style={styles.lowDataTitle}>Fast village marketplace</Text><Text style={styles.villageText}>Products, prices and orders stay available with fewer image downloads.</Text></View></View> : <View style={styles.heroShowcase}><View style={styles.heroMain}><HeroBanner banner={heroBanner} desktop={desktop} /></View>{desktop ? <PromoTiles campaigns={growthQuery.data?.campaigns || []} couponCode={growthQuery.data?.coupons[0]?.code} /> : null}</View>}
            <View style={[styles.quickDeals, compact && responsive.quickDealsCompact]}>{quickDeals.map((deal) => <Pressable key={deal.title} onPress={() => router.push(deal.href as never)} style={[styles.quickDeal, compact && responsive.quickDealCompact]}><View style={styles.quickIcon}><Ionicons color={colors.accent} name={deal.icon as never} size={22} /></View><Text style={styles.quickText}>{deal.title}</Text></Pressable>)}</View>
            <View style={[styles.section, compact && responsive.sectionCompact]}><HomeSectionTitle eyebrow="EXPLORE DEPARTMENTS" href="/categories" title="Shop by category" />{categoryQuery.isLoading ? <ActivityIndicator color={colors.primary} /> : <CategoryRail data={liveCategories} />}{categoryQuery.error ? <RetryState label="Categories unavailable. Start the API and run npm run demo:setup." onRetry={() => categoryQuery.refetch()} /> : null}</View>

            {activeFlashSale ? <View style={[styles.flashSection, desktop && styles.desktopFlash]}>
              <View style={[styles.flashHeading, compact && responsive.flashHeadingCompact]}>
                <View><View style={styles.flashEyebrowRow}><Ionicons color={colors.accent} name="flash" size={17} /><Text style={styles.flashEyebrow}>FLASH SALE</Text></View><Text style={styles.flashTitle}>{activeFlashSale.name}</Text></View>
                <FlashSaleCountdown endAt={activeFlashSale.endsAt} />
              </View>
              {productQuery.isLoading ? <ActivityIndicator color={colors.surface} /> : <ProductGrid columns={columns} lowData={lowData} products={flashProducts} />}
            </View> : null}

            <View style={[styles.promo, compact && responsive.promoCompact]}>
              <View style={styles.promoIcon}><Ionicons color={colors.surface} name="gift-outline" size={30} /></View>
              <View style={styles.promoCopy}><Text style={styles.promoKicker}>ACTIVE CAMPAIGNS</Text><Text style={styles.promoTitle}>{growthQuery.data?.campaigns[0]?.name || "New campaigns coming soon"}</Text><Text style={styles.promoText}>{growthQuery.data?.campaigns[0] ? `Available until ${new Date(growthQuery.data.campaigns[0].endsAt).toLocaleDateString()}` : "Verified offers appear here when published"}</Text></View>
              <View style={[styles.promoCode, compact && responsive.promoCodeCompact]}><Text style={styles.promoCodeText}>{growthQuery.data?.coupons[0]?.code || `${growthQuery.data?.campaigns.length || 0} LIVE`}</Text></View>
            </View>

            <View style={styles.section}><HomeSectionTitle eyebrow="MARKETPLACE FEED" href="/search" title="Trending now" />{productQuery.error ? <RetryState label="Could not load live products" onRetry={() => productQuery.refetch()} /> : <ProductGrid columns={columns} lowData={lowData} products={liveProducts.slice(0, 10)} />}{!productQuery.isLoading && !productQuery.error && liveProducts.length === 0 ? <Text style={styles.empty}>No approved products yet. Run the catalog seed or publish a vendor product.</Text> : null}</View>

            {shopQuery.data?.data.length ? <View style={styles.section}><HomeSectionTitle eyebrow="FEATURED BRANDS" href="/shops" title="Shop trusted sellers" /><ShopRail shops={shopQuery.data.data} /></View> : null}

            {!lowData && (recommendedProducts.length || liveProducts.length > 5) ? <View style={styles.section}><HomeSectionTitle eyebrow="CURATED FOR YOU" href="/search" title="Recommended for you" />{recommendationQuery.isFetching && !recommendedProducts.length ? <ActivityIndicator color={colors.primary} /> : <ProductGrid columns={columns} lowData={lowData} products={recommendedProducts.length ? recommendedProducts : liveProducts.slice(5)} />}</View> : null}

            <View style={[styles.benefits, compact && responsive.benefitsCompact]}>
              {benefits.map((benefit) => (
                <View key={benefit.title} style={[styles.benefit, compact && responsive.benefitCompact]}>
                  <View style={styles.benefitIcon}><Ionicons color={colors.primary} name={benefit.icon as never} size={23} /></View>
                  <View><Text style={styles.benefitTitle}>{benefit.title}</Text><Text style={styles.benefitText}>{benefit.text}</Text></View>
                </View>
              ))}
            </View>

            <DeliveryAvailability />
            <NewsletterSignup />
            <StoreFooter />
          </View>
        </ScrollView>
        {!desktop ? <BottomNav /> : null}
      </View>
    </SafeAreaView>
  );
}

const responsive = StyleSheet.create({
  actionCompact: { justifyContent: "center", width: "100%" },
  benefitCompact: { flexBasis: "48%", minWidth: 0, padding: spacing.sm },
  benefitsCompact: { gap: spacing.xs },
  contentCompact: { gap: spacing.md, paddingHorizontal: spacing.sm },
  flashHeadingCompact: { alignItems: "flex-start", flexDirection: "column" },
  promoCodeCompact: { alignItems: "center", width: "100%" },
  promoCompact: { alignItems: "flex-start", flexDirection: "column", padding: spacing.md },
  quickDealCompact: { flexBasis: "46%", minWidth: 0 },
  quickDealsCompact: { gap: spacing.xs },
  sectionCompact: { padding: spacing.sm },
  villageBarCompact: { alignItems: "stretch", flexDirection: "column" },
  villageCopyCompact: { minWidth: 0, width: "100%" }
});

function RetryState({ label, onRetry }: { label: string; onRetry(): void }) {
  return <View style={styles.retry}><Text style={styles.empty}>{label}</Text><Pressable onPress={onRetry}><Text style={styles.retryText}>Try again</Text></Pressable></View>;
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.surface, flex: 1 },
  screen: { flex: 1 },
  scrollContent: { backgroundColor: colors.background, paddingBottom: 4 },
  content: { alignSelf: "center", gap: 18, paddingHorizontal: spacing.sm, paddingVertical: spacing.md },
  section: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md },
  heroShowcase: { flexDirection: "row", gap: spacing.md }, heroMain: { flex: 1 },
  quickDeals: { backgroundColor: colors.surface, borderRadius: radius.lg, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, padding: spacing.sm },
  quickDeal: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.sm, minWidth: 150, paddingHorizontal: spacing.sm, paddingVertical: 10 },
  quickIcon: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.pill, height: 38, justifyContent: "center", width: 38 },
  quickText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  flashSection: { backgroundColor: colors.navy, borderRadius: radius.lg, overflow: "hidden", padding: spacing.md },
  desktopFlash: { padding: spacing.lg },
  flashHeading: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between", marginBottom: spacing.md },
  flashEyebrowRow: { alignItems: "center", flexDirection: "row", gap: 5 },
  flashEyebrow: { color: colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  flashTitle: { color: colors.surface, fontSize: 22, fontWeight: "700", marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6, rowGap: 12 },
  cardSlot: { paddingHorizontal: 6 },
  villageBar: { alignItems: "center", backgroundColor: colors.accentSoft, borderColor: colors.accent, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, padding: spacing.md },
  villageCopy: { flex: 1, minWidth: 190 }, villageTitle: { color: colors.text, fontSize: 15, fontWeight: "700" }, villageText: { color: colors.muted, fontSize: 11, marginTop: 3 },
  dataButton: { alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.pill, flexDirection: "row", gap: 5, minHeight: 40, paddingHorizontal: 13 }, dataButtonText: { color: colors.surface, fontSize: 10, fontWeight: "700" },
  helpButton: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radius.pill, borderWidth: 1, flexDirection: "row", gap: 5, minHeight: 40, paddingHorizontal: 13 }, helpButtonText: { color: colors.primary, fontSize: 10, fontWeight: "700" },
  lowDataHero: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 96, padding: spacing.lg }, lowDataTitle: { color: colors.text, fontSize: 20, fontWeight: "700" },
  promo: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, flexDirection: "row", flexWrap: "wrap", gap: 14, padding: 20 },
  promoIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: radius.pill, height: 58, justifyContent: "center", width: 58 },
  promoCopy: { flex: 1, minWidth: 200 },
  promoKicker: { color: "#bae6fd", fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  promoTitle: { color: colors.surface, fontSize: 20, fontWeight: "700", marginTop: 3 },
  promoText: { color: "rgba(255,255,255,0.82)", fontSize: 11, marginTop: 4 },
  promoCode: { borderColor: "rgba(255,255,255,0.6)", borderRadius: radius.md, borderStyle: "dashed", borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  promoCodeText: { color: colors.surface, fontSize: 12, fontWeight: "700", letterSpacing: 0.7 },
  benefits: { backgroundColor: colors.surface, borderRadius: radius.lg, flexDirection: "row", flexWrap: "wrap", padding: 10 },
  benefit: { alignItems: "center", flex: 1, flexDirection: "row", gap: 10, minWidth: 220, padding: 12 },
  benefitIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 44, justifyContent: "center", width: 44 },
  benefitTitle: { color: colors.text, fontSize: 12, fontWeight: "700" },
  benefitText: { color: colors.muted, fontSize: 10, marginTop: 2 },
  empty: { color: colors.muted, padding: spacing.lg, textAlign: "center" }, retry: { alignItems: "center", gap: spacing.sm }, retryText: { color: colors.primary, fontWeight: "700" }
});
