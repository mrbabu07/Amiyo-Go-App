import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { ProductCard } from "../home/components/ProductCard";
import { StoreHeader } from "../home/components/StoreHeader";
import { getCategories, getProducts, searchProducts } from "./catalog.api";
import { toHomeProduct } from "./catalog.view-model";

export function ProductListScreen({ category, query, title }: { category?: string; query?: string; title: string }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const columns = width >= 1180 ? 5 : width >= 820 ? 4 : 2;
  const result = useQuery({ queryKey: ["catalog", "products", category, query], queryFn: () => query ? searchProducts(query) : getProducts({ category, limit: 30 }) });
  const categories = useQuery({ queryKey: ["catalog", "categories"], queryFn: getCategories, enabled: Boolean(category) });
  const selectedCategory = categories.data?.find((item) => item.slug === category || item.id === category);
  const childCategories = categories.data?.filter((item) => item.parentId === selectedCategory?.id) || [];
  const pageTitle = selectedCategory?.name || title;

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}><StoreHeader desktop={desktop} viewportWidth={width} /><View style={styles.content}><Pressable onPress={() => router.push("/categories")}><Text style={styles.back}>‹ All categories</Text></Pressable><Text accessibilityRole="header" style={styles.title}>{pageTitle}</Text><Text style={styles.subtitle}>{selectedCategory?.description || `${result.data?.data.length ?? 0} products found`}</Text>{childCategories.length ? <View style={styles.subcategories}>{childCategories.map((item) => <Pressable key={item.id} onPress={() => router.push(`/category/${item.slug}` as never)} style={styles.subcategory}><Text style={styles.subcategoryText}>{item.name}</Text><Text style={styles.subcategoryArrow}>→</Text></Pressable>)}</View> : null}{result.isLoading ? <ActivityIndicator color={colors.primary} size="large" /> : null}{result.error ? <View style={styles.state}><Text style={styles.error}>Could not load products.</Text><Pressable onPress={() => result.refetch()}><Text style={styles.back}>Try again</Text></Pressable></View> : null}<View style={styles.grid}>{result.data?.data.map(toHomeProduct).map((product) => <View key={product.id} style={[styles.slot, { width: `${100 / columns}%` as `${number}%` }]}><ProductCard product={product} /></View>)}</View>{result.data?.data.length === 0 ? <View style={styles.state}><Text style={styles.empty}>No matching products yet.</Text></View> : null}</View></ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 }, page: { minHeight: "100%" }, content: { alignSelf: "center", maxWidth: 1208, padding: spacing.lg, width: "100%" }, back: { color: colors.primary, fontWeight: "900" }, title: { color: colors.text, fontSize: 28, fontWeight: "900", marginTop: spacing.lg }, subtitle: { color: colors.muted, marginBottom: spacing.lg, marginTop: 5 }, subcategories: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg }, subcategory: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 11 }, subcategoryText: { color: colors.text, fontWeight: "800" }, subcategoryArrow: { color: colors.primary, fontWeight: "900" }, grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6, rowGap: 12 }, slot: { paddingHorizontal: 6 }, state: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, padding: spacing.xl }, error: { color: colors.danger }, empty: { color: colors.muted }
});
