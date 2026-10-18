import { Ionicons } from "@expo/vector-icons";
import type { ProductSummaryDto } from "@amiyo/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { createThread } from "../engagement/engagement.api";
import { ProductCard } from "../home/components/ProductCard";
import { StoreHeader } from "../home/components/StoreHeader";
import { getCategories, getShop } from "./catalog.api";
import { toHomeProduct } from "./catalog.view-model";
import { ShopFilters, type ShopSortMode } from "./components/ShopFilters";

function sortProducts(products: ProductSummaryDto[], sort: ShopSortMode) {
  return [...products].sort((left, right) => {
    if (sort === "price-low") return Number(left.minimumPrice.amountMinor) - Number(right.minimumPrice.amountMinor);
    if (sort === "price-high") return Number(right.minimumPrice.amountMinor) - Number(left.minimumPrice.amountMinor);
    if (sort === "rating") return right.rating - left.rating || right.reviewCount - left.reviewCount;
    if (sort === "popular") return right.reviewCount - left.reviewCount || right.rating - left.rating;
    return new Date(right.publishedAt || 0).getTime() - new Date(left.publishedAt || 0).getTime();
  });
}

export function ShopScreen({ identifier }: { identifier: string }) {
  const router = useRouter();
  const user = useCurrentUser();
  const activeUid = useRef(user?.uid); activeUid.current = user?.uid;
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const compact = width < 620;
  const columns = width >= 1180 ? 4 : width >= 760 ? 3 : width < 360 ? 1 : 2;
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sort, setSort] = useState<ShopSortMode>("newest");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const result = useQuery({ queryKey: ["catalog", "shop", identifier], queryFn: () => getShop(identifier) });
  const categories = useQuery({ queryKey: ["catalog", "categories"], queryFn: getCategories });
  const products = result.data?.products.data || [];
  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((product) => counts.set(product.categoryId, (counts.get(product.categoryId) || 0) + 1));
    return (categories.data || []).filter((category) => counts.has(category.id)).map((category) => ({ count: counts.get(category.id) || 0, id: category.id, name: category.name })).sort((left, right) => left.name.localeCompare(right.name));
  }, [categories.data, products]);
  const filteredProducts = useMemo(() => sortProducts(selectedCategory === "all" ? products : products.filter((product) => product.categoryId === selectedCategory), sort), [products, selectedCategory, sort]);
  const chat = useMutation({ mutationFn: async () => { if (!user || activeUid.current !== user.uid || !result.data) throw new Error("Sign in to message this seller"); return { thread: await createThread(user, result.data.vendorId, `Question about ${result.data.name}`), uid: user.uid }; }, onSuccess: ({ thread, uid }) => { if (activeUid.current === uid) router.push(`/messages/${thread.id}` as never); } });
  function startChat() { if (!user) { router.push("/auth"); return; } chat.mutate(); }
  function resetFilters() { setSelectedCategory("all"); setSort("newest"); }
  const filters = <ShopFilters categories={categoryOptions} onCategory={setSelectedCategory} onReset={resetFilters} onSort={setSort} productCount={products.length} selectedCategory={selectedCategory} sort={sort} />;

  return <SafeAreaView style={styles.safe}><ScrollView><StoreHeader desktop={desktop} viewportWidth={width} /><View style={[styles.content, compact && responsive.contentCompact]}>
    <Pressable onPress={() => router.back()} style={styles.back}><Ionicons color={colors.primary} name="chevron-back" size={17} /><Text style={styles.link}>Back</Text></Pressable>
    {result.isLoading ? <ActivityIndicator color={colors.primary} size="large" /> : null}
    {result.data ? <>
      <View style={[styles.hero, compact && responsive.heroCompact]}>{result.data.bannerUrl ? <Image accessibilityLabel={`${result.data.name} cover`} resizeMode="cover" source={{ uri: result.data.bannerUrl }} style={styles.bannerImage} /> : null}<View style={styles.heroOverlay} />{result.data.logoUrl ? <Image accessibilityLabel={`${result.data.name} logo`} source={{ uri: result.data.logoUrl }} style={styles.logoImage} /> : <View style={styles.logo}><Text style={styles.logoText}>{result.data.name.slice(0, 1)}</Text></View>}<View style={[styles.shopCopy, compact && responsive.shopCopyCompact]}><Text accessibilityRole="header" style={[styles.title, compact && responsive.titleCompact]}>{result.data.name}</Text><Text style={styles.description}>{result.data.description || "Verified Amiyo-Go shop"}</Text><Text style={styles.count}>{result.data.productCount} products</Text></View><Pressable disabled={chat.isPending} onPress={startChat} style={[styles.messageButton, compact && responsive.messageButtonCompact]}><Ionicons color={colors.navy} name="chatbubble-ellipses-outline" size={17} /><Text style={styles.messageText}>{chat.isPending ? "Opening…" : "Message seller"}</Text></Pressable></View>
      {chat.error ? <Text style={styles.error}>{chat.error.message}</Text> : null}
      {result.data.storefront?.tagline ? <Text style={styles.tagline}>{result.data.storefront.tagline}</Text> : null}
      {result.data.storefront?.announcement ? <View style={styles.announcement}><Ionicons color={colors.primary} name="megaphone-outline" size={18} /><Text style={styles.announcementText}>{result.data.storefront.announcement}</Text></View> : null}
      {result.data.storefront?.trustMessage ? <View style={styles.trustBar}><Ionicons color={colors.accent} name="shield-checkmark-outline" size={19} /><Text style={styles.trustText}>{result.data.storefront.trustMessage}</Text></View> : null}
      {!desktop ? <Pressable accessibilityRole="button" onPress={() => setShowMobileFilters((visible) => !visible)} style={styles.mobileFilterButton}><View style={styles.mobileFilterCopy}><Ionicons color={colors.text} name="options-outline" size={19} /><Text style={styles.mobileFilterText}>Filters & Sort</Text></View><View style={styles.mobileFilterCopy}><Text style={styles.mobileFilterMeta}>{filteredProducts.length} items</Text><Ionicons color={colors.muted} name={showMobileFilters ? "chevron-up" : "chevron-down"} size={18} /></View></Pressable> : null}
      {!desktop && showMobileFilters ? <View style={styles.mobileFilters}>{filters}</View> : null}
      <View style={styles.catalogLayout}>{desktop ? <View style={styles.sidebar}>{filters}</View> : null}<View style={styles.productsArea}>
        <View style={[styles.productsHeader, compact && responsive.productsHeaderCompact]}><View><Text style={styles.productsTitle}>All Products</Text><Text style={styles.productsMeta}>Showing {filteredProducts.length} of {products.length} products</Text></View>{selectedCategory !== "all" ? <Pressable onPress={resetFilters} style={styles.clearButton}><Text style={styles.clearText}>Clear filter</Text></Pressable> : null}</View>
        {filteredProducts.length ? <View style={styles.grid}>{filteredProducts.map(toHomeProduct).map((product) => <View key={product.id} style={[styles.slot, { width: `${100 / columns}%` as `${number}%` }]}><ProductCard product={product} /></View>)}</View> : <View style={styles.emptyState}><View style={styles.emptyIcon}><Ionicons color="#94a3b8" name="cube-outline" size={42} /></View><Text style={styles.emptyTitle}>No Products Found</Text><Text style={styles.emptyText}>Try adjusting your filters or check back later.</Text><Pressable onPress={resetFilters} style={styles.resetButton}><Text style={styles.resetButtonText}>Reset filters</Text></Pressable></View>}
      </View></View>
    </> : null}
    {result.error ? <Text style={styles.error}>Shop could not be loaded.</Text> : null}
  </View></ScrollView></SafeAreaView>;
}

const responsive = StyleSheet.create({ contentCompact: { padding: spacing.sm }, heroCompact: { alignItems: "flex-start", flexDirection: "column", gap: spacing.md, marginBottom: spacing.lg, marginTop: spacing.md, padding: spacing.lg }, messageButtonCompact: { justifyContent: "center", width: "100%" }, productsHeaderCompact: { alignItems: "flex-start", flexDirection: "column", gap: spacing.sm }, shopCopyCompact: { minWidth: 0, width: "100%" }, titleCompact: { fontSize: 24 } });

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 }, content: { alignSelf: "center", maxWidth: 1208, padding: spacing.lg, width: "100%" },
  back: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row" }, link: { color: colors.primary, fontWeight: "700" },
  hero: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", flexWrap: "wrap", gap: spacing.lg, marginBottom: spacing.xl, marginTop: spacing.lg, minHeight: 180, overflow: "hidden", padding: spacing.xl, position: "relative" }, bannerImage: { ...StyleSheet.absoluteFillObject }, heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(5,11,20,.68)" },
  logo: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.pill, height: 72, justifyContent: "center", width: 72 }, logoText: { color: "#fff", fontSize: 30, fontWeight: "700" },
  logoImage: { backgroundColor: colors.surface, borderColor: colors.surface, borderRadius: radius.pill, borderWidth: 3, height: 72, width: 72 },
  shopCopy: { flex: 1, minWidth: 180 }, title: { color: "#fff", fontSize: 28, fontWeight: "700" }, description: { color: "#cbd5e1", marginTop: 5 }, count: { color: "#7dd3fc", fontSize: 11, fontWeight: "700", marginTop: 8, textTransform: "uppercase" },
  messageButton: { alignItems: "center", backgroundColor: "#fff", borderRadius: radius.md, flexDirection: "row", gap: 7, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }, messageText: { color: colors.navy, fontWeight: "700" },
  announcement: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm, padding: spacing.md }, announcementText: { color: colors.text, flex: 1, fontWeight: "600" }, trustBar: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg, padding: spacing.md }, trustText: { color: colors.text, flex: 1, fontSize: 12 },
  tagline: { color: colors.text, fontSize: 17, fontWeight: "600", marginBottom: spacing.md },
  mobileFilterButton: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md, padding: spacing.md }, mobileFilterCopy: { alignItems: "center", flexDirection: "row", gap: 7 }, mobileFilterText: { color: colors.text, fontWeight: "700" }, mobileFilterMeta: { color: colors.muted, fontSize: 12 }, mobileFilters: { marginBottom: spacing.md },
  catalogLayout: { alignItems: "flex-start", flexDirection: "row", gap: spacing.lg }, sidebar: { width: 250 }, productsArea: { flex: 1, minWidth: 0 },
  productsHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg }, productsTitle: { color: colors.text, fontSize: 24, fontWeight: "700" }, productsMeta: { color: colors.muted, marginTop: 4 }, clearButton: { backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 }, clearText: { color: "#c2410c", fontSize: 12, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6, rowGap: 12 }, slot: { paddingHorizontal: 6 },
  emptyState: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: 52 }, emptyIcon: { alignItems: "center", backgroundColor: "#f1f5f9", borderRadius: radius.pill, height: 84, justifyContent: "center", marginBottom: spacing.md, width: 84 }, emptyTitle: { color: colors.text, fontSize: 20, fontWeight: "700" }, emptyText: { color: colors.muted, marginTop: 6, textAlign: "center" }, resetButton: { backgroundColor: colors.accent, borderRadius: radius.md, marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 11 }, resetButtonText: { color: "#fff", fontWeight: "700" }, error: { color: colors.danger, marginBottom: spacing.md }
});
