import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { StoreHeader } from "../home/components/StoreHeader";
import { getProduct } from "./catalog.api";
import { fallbackProductImage } from "./catalog.view-model";

const money = (minor: string) => `৳${(Number(minor) / 100).toLocaleString("en-BD")}`;

export function ProductDetailScreen({ identifier }: { identifier: string }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const product = useQuery({ queryKey: ["catalog", "product", identifier], queryFn: () => getProduct(identifier) });
  if (product.isLoading) return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></SafeAreaView>;
  if (!product.data) return <SafeAreaView style={styles.center}><Text style={styles.error}>{product.error instanceof Error ? product.error.message : "Product not found"}</Text><Pressable onPress={() => router.back()}><Text style={styles.link}>Go back</Text></Pressable></SafeAreaView>;
  const item = product.data;
  const selected = item.variants[0];
  return <SafeAreaView style={styles.safe}><ScrollView><StoreHeader desktop={desktop} viewportWidth={width} /><View style={[styles.page, desktop && styles.desktop]}><View style={styles.media}><Image accessibilityLabel={item.name} resizeMode="cover" source={{ uri: item.media[0]?.url || item.thumbnailUrl || fallbackProductImage }} style={styles.image} /></View><View style={styles.info}><Text style={styles.brand}>{item.brand || "AMIYO VERIFIED"}</Text><Text accessibilityRole="header" style={styles.title}>{item.name}</Text><Pressable onPress={() => router.push(`/shop/${item.shopSlug}` as never)}><Text style={styles.link}>{item.shopName} ›</Text></Pressable><View style={styles.rating}><Ionicons color="#f59e0b" name="star" size={17} /><Text style={styles.ratingText}>{item.rating.toFixed(1)} ({item.reviewCount} reviews)</Text></View><Text style={styles.price}>{selected ? money(selected.price.amountMinor) : "Unavailable"}</Text>{selected?.compareAtPrice ? <Text style={styles.compare}>{money(selected.compareAtPrice.amountMinor)}</Text> : null}<Text style={styles.stock}>{selected?.availableQuantity ? `${selected.availableQuantity} available` : "Out of stock"}</Text><Text style={styles.description}>{item.description || "Product details will be available soon."}</Text><View style={styles.variants}>{item.variants.map((variant) => <View key={variant.id} style={styles.variant}><Text style={styles.variantTitle}>{variant.title}</Text><Text style={styles.variantStock}>{variant.availableQuantity} in stock</Text></View>)}</View><Pressable disabled={!selected?.availableQuantity} style={styles.cta}><Ionicons color="#fff" name="cart-outline" size={20} /><Text style={styles.ctaText}>Add to cart</Text></Pressable></View></View></ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 }, center: { alignItems: "center", backgroundColor: colors.background, flex: 1, gap: spacing.md, justifyContent: "center" }, page: { alignSelf: "center", gap: spacing.lg, maxWidth: 1100, padding: spacing.lg, width: "100%" }, desktop: { alignItems: "flex-start", flexDirection: "row" }, media: { aspectRatio: 1, backgroundColor: colors.surface, borderRadius: radius.xl, flex: 1, overflow: "hidden", width: "100%" }, image: { height: "100%", width: "100%" }, info: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, flex: 1, padding: spacing.xl }, brand: { color: colors.accent, fontSize: 11, fontWeight: "900", letterSpacing: 1 }, title: { color: colors.text, fontSize: 30, fontWeight: "900", marginBottom: spacing.sm, marginTop: spacing.sm }, link: { color: colors.primary, fontWeight: "900" }, rating: { alignItems: "center", flexDirection: "row", gap: 5, marginTop: spacing.md }, ratingText: { color: colors.muted }, price: { color: colors.accent, fontSize: 30, fontWeight: "900", marginTop: spacing.lg }, compare: { color: colors.muted, textDecorationLine: "line-through" }, stock: { color: colors.success, fontWeight: "800", marginTop: spacing.sm }, description: { color: colors.muted, lineHeight: 22, marginTop: spacing.lg }, variants: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg }, variant: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, padding: spacing.md }, variantTitle: { color: colors.text, fontWeight: "900" }, variantStock: { color: colors.muted, fontSize: 10, marginTop: 3 }, cta: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", marginTop: spacing.xl, minHeight: 52 }, ctaText: { color: "#fff", fontWeight: "900" }, error: { color: colors.danger }
});
