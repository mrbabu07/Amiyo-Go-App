import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { ProductCard } from "../home/components/ProductCard";
import { StoreHeader } from "../home/components/StoreHeader";
import { getProducts, searchProducts } from "./catalog.api";
import { toHomeProduct } from "./catalog.view-model";

export function ProductListScreen({ category, query, title }: { category?: string; query?: string; title: string }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const columns = width >= 1180 ? 5 : width >= 820 ? 4 : 2;
  const result = useQuery({ queryKey: ["catalog", "products", category, query], queryFn: () => query ? searchProducts(query) : getProducts({ category, limit: 30 }) });

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}><StoreHeader desktop={desktop} viewportWidth={width} /><View style={styles.content}><Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></Pressable><Text accessibilityRole="header" style={styles.title}>{title}</Text><Text style={styles.subtitle}>{result.data?.data.length ?? 0} products found</Text>{result.isLoading ? <ActivityIndicator color={colors.primary} size="large" /> : null}{result.error ? <View style={styles.state}><Text style={styles.error}>Could not load products.</Text><Pressable onPress={() => result.refetch()}><Text style={styles.back}>Try again</Text></Pressable></View> : null}<View style={styles.grid}>{result.data?.data.map(toHomeProduct).map((product) => <View key={product.id} style={[styles.slot, { width: `${100 / columns}%` as `${number}%` }]}><ProductCard product={product} /></View>)}</View>{result.data?.data.length === 0 ? <View style={styles.state}><Text style={styles.empty}>No matching products yet.</Text></View> : null}</View></ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 }, page: { minHeight: "100%" }, content: { alignSelf: "center", maxWidth: 1208, padding: spacing.lg, width: "100%" }, back: { color: colors.primary, fontWeight: "900" }, title: { color: colors.text, fontSize: 28, fontWeight: "900", marginTop: spacing.lg }, subtitle: { color: colors.muted, marginBottom: spacing.lg, marginTop: 5 }, grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6, rowGap: 12 }, slot: { paddingHorizontal: 6 }, state: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, padding: spacing.xl }, error: { color: colors.danger }, empty: { color: colors.muted }
});
