import { Ionicons } from "@expo/vector-icons";
import type { ProductSummaryDto } from "@amiyo/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
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
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
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
  const chat = useMutation({ mutationFn: async () => { const user = firebaseAuth?.currentUser; if (!user || !result.data) throw new Error("Sign in to message this seller"); return createThread(user, result.data.vendorId, `Question about ${result.data.name}`); }, onSuccess: (thread) => router.push(`/messages/${thread.id}` as never) });
  function startChat() { if (!firebaseAuth?.currentUser) { router.push("/auth"); return; } chat.mutate(); }
  function resetFilters() { setSelectedCategory("all"); setSort("newest"); }
  const filters = <ShopFilters categories={categoryOptions} onCategory={setSelectedCategory} onReset={resetFilters} onSort={setSort} productCount={products.length} selectedCategory={selectedCategory} sort={sort} />;

  return <SafeAreaView style={styles.safe}><ScrollView><StoreHeader desktop={desktop} viewportWidth={width} /><View style={styles.content}>
    <Pressable onPress={() => router.back()} style={styles.back}><Ionicons color={colors.primary} name="chevron-back" size={17} /><Text style={styles.link}>Back</Text></Pressable>
    {result.isLoading ? <ActivityIndicator color={colors.primary} size="large" /> : null}
    {result.data ? <>
      <View style={styles.hero}><View style={styles.logo}><Text style={styles.logoText}>{result.data.name.slice(0, 1)}</Text></View><View style={styles.shopCopy}><Text accessibilityRole="header" style={styles.title}>{result.data.name}</Text><Text style={styles.description}>{result.data.description || "Verified Amiyo-Go shop"}</Text><Text style={styles.count}>{result.data.productCount} products</Text></View><Pressable disabled={chat.isPending} onPress={startChat} style={styles.messageButton}><Ionicons color={colors.navy} name="chatbubble-ellipses-outline" size={17} /><Text style={styles.messageText}>{chat.isPending ? "Opening…" : "Message seller"}</Text></Pressable></View>
      {chat.error ? <Text style={styles.error}>{chat.error.message}</Text> : null}
      {!desktop ? <Pressable accessibilityRole="button" onPress={() => setShowMobileFilters((visible) => !visible)} style={styles.mobileFilterButton}><View style={styles.mobileFilterCopy}><Ionicons color={colors.text} name="options-outline" size={19} /><Text style={styles.mobileFilterText}>Filters & Sort</Text></View><View style={styles.mobileFilterCopy}><Text style={styles.mobileFilterMeta}>{filteredProducts.length} items</Text><Ionicons color={colors.muted} name={showMobileFilters ? "chevron-up" : "chevron-down"} size={18} /></View></Pressable> : null}
      {!desktop && showMobileFilters ? <View style={styles.mobileFilters}>{filters}</View> : null}
      <View style={styles.catalogLayout}>{desktop ? <View style={styles.sidebar}>{filters}</View> : null}<View style={styles.productsArea}>
        <View style={styles.productsHeader}><View><Text style={styles.productsTitle}>All Products</Text><Text style={styles.productsMeta}>Showing {filteredProducts.length} of {products.length} products</Text></View>{selectedCategory !== "all" ? <Pressable onPress={resetFilters} style={styles.clearButton}><Text style={styles.clearText}>Clear filter</Text></Pressable> : null}</View>
        {filteredProducts.length ? <View style={styles.grid}>{filteredProducts.map(toHomeProduct).map((product) => <View key={product.id} style={[styles.slot, { width: `${100 / columns}%` as `${number}%` }]}><ProductCard product={product} /></View>)}</View> : <View style={styles.emptyState}><View style={styles.emptyIcon}><Ionicons color="#94a3b8" name="cube-outline" size={42} /></View><Text style={styles.emptyTitle}>No Products Found</Text><Text style={styles.emptyText}>Try adjusting your filters or check back later.</Text><Pressable onPress={resetFilters} style={styles.resetButton}><Text style={styles.resetButtonText}>Reset filters</Text></Pressable></View>}
      </View></View>
    </> : null}
    {result.error ? <Text style={styles.error}>Shop could not be loaded.</Text> : null}
  </View></ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 }, content: { alignSelf: "center", maxWidth: 1208, padding: spacing.lg, width: "100%" },
  back: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row" }, link: { color: colors.primary, fontWeight: "700" },
  hero: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", flexWrap: "wrap", gap: spacing.lg, marginBottom: spacing.xl, marginTop: spacing.lg, padding: spacing.xl },
  logo: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.pill, height: 72, justifyContent: "center", width: 72 }, logoText: { color: "#fff", fontSize: 30, fontWeight: "700" },
  shopCopy: { flex: 1, minWidth: 180 }, title: { color: "#fff", fontSize: 28, fontWeight: "700" }, description: { color: "#cbd5e1", marginTop: 5 }, count: { color: "#7dd3fc", fontSize: 11, fontWeight: "700", marginTop: 8, textTransform: "uppercase" },
  messageButton: { alignItems: "center", backgroundColor: "#fff", borderRadius: radius.md, flexDirection: "row", gap: 7, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }, messageText: { color: colors.navy, fontWeight: "700" },
  mobileFilterButton: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md, padding: spacing.md }, mobileFilterCopy: { alignItems: "center", flexDirection: "row", gap: 7 }, mobileFilterText: { color: colors.text, fontWeight: "700" }, mobileFilterMeta: { color: colors.muted, fontSize: 12 }, mobileFilters: { marginBottom: spacing.md },
  catalogLayout: { alignItems: "flex-start", flexDirection: "row", gap: spacing.lg }, sidebar: { width: 250 }, productsArea: { flex: 1, minWidth: 0 },
  productsHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg }, productsTitle: { color: colors.text, fontSize: 24, fontWeight: "700" }, productsMeta: { color: colors.muted, marginTop: 4 }, clearButton: { backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 }, clearText: { color: "#c2410c", fontSize: 12, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6, rowGap: 12 }, slot: { paddingHorizontal: 6 },
  emptyState: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: 52 }, emptyIcon: { alignItems: "center", backgroundColor: "#f1f5f9", borderRadius: radius.pill, height: 84, justifyContent: "center", marginBottom: spacing.md, width: 84 }, emptyTitle: { color: colors.text, fontSize: 20, fontWeight: "700" }, emptyText: { color: colors.muted, marginTop: 6, textAlign: "center" }, resetButton: { backgroundColor: colors.accent, borderRadius: radius.md, marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 11 }, resetButtonText: { color: "#fff", fontWeight: "700" }, error: { color: colors.danger, marginBottom: spacing.md }
});
