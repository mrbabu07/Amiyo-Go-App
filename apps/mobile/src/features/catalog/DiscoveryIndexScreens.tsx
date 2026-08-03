import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { StoreHeader } from "../home/components/StoreHeader";
import { getCategories, getShops } from "./catalog.api";
import { getCategoryVisual } from "./category-visuals";

export function CategoriesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const columns = width >= 1100 ? 4 : width >= 720 ? 3 : 2;
  const cardWidth = `${100 / columns}%` as `${number}%`;
  const result = useQuery({ queryKey: ["catalog", "categories"], queryFn: getCategories });
  return <DiscoveryShell><StoreHeader desktop={width >= 900} viewportWidth={width} /><View style={styles.content}><Text accessibilityRole="header" style={styles.title}>Shop by category</Text><Text style={styles.subtitle}>Browse every active Amiyo-Go department.</Text>{result.isLoading ? <ActivityIndicator color={colors.primary} /> : null}<View style={styles.grid}>{result.data?.map((category, index) => { const visual = getCategoryVisual(category, index); return <View key={category.id} style={[styles.cardSlot, { width: cardWidth }]}><Pressable accessibilityRole="button" onPress={() => router.push(`/category/${category.slug}` as never)} style={styles.card}><View style={[styles.icon, { backgroundColor: visual.background }]}><Ionicons color={visual.foreground} name={visual.icon as never} size={30} /></View><Text style={styles.cardTitle}>{category.name}</Text><Text numberOfLines={2} style={styles.cardText}>{category.description || "Explore products"}</Text><View style={styles.explore}><Text style={styles.exploreText}>Explore</Text><Ionicons color={colors.primary} name="arrow-forward" size={14} /></View></Pressable></View>; })}</View>{result.error ? <Text style={styles.error}>Could not load categories.</Text> : null}</View></DiscoveryShell>;
}

export function ShopsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const columns = width >= 1100 ? 4 : width >= 720 ? 3 : 2;
  const cardWidth = `${100 / columns}%` as `${number}%`;
  const result = useQuery({ queryKey: ["catalog", "shops"], queryFn: getShops });
  return <DiscoveryShell><StoreHeader desktop={width >= 900} viewportWidth={width} /><View style={styles.content}><Text accessibilityRole="header" style={styles.title}>Verified shops</Text><Text style={styles.subtitle}>Discover approved marketplace sellers.</Text>{result.isLoading ? <ActivityIndicator color={colors.primary} /> : null}<View style={styles.grid}>{result.data?.data.map((shop) => <View key={shop.id} style={[styles.cardSlot, { width: cardWidth }]}><Pressable accessibilityRole="button" onPress={() => router.push(`/shop/${shop.slug}` as never)} style={styles.card}><View style={styles.shopIcon}><Text style={styles.shopInitial}>{shop.name.slice(0, 1)}</Text></View><Text style={styles.cardTitle}>{shop.name}</Text><Text numberOfLines={2} style={styles.cardText}>{shop.description || "Verified Amiyo-Go seller"}</Text><Text style={styles.count}>{shop.productCount} products</Text></Pressable></View>)}</View>{result.error ? <Text style={styles.error}>Could not load shops.</Text> : null}</View></DiscoveryShell>;
}

function DiscoveryShell({ children }: { children: React.ReactNode }) { return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}>{children}</ScrollView></SafeAreaView>; }

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 }, page: { minHeight: "100%" }, content: { alignSelf: "center", maxWidth: 1208, padding: spacing.lg, width: "100%" }, title: { color: colors.text, fontSize: 30, fontWeight: "900" }, subtitle: { color: colors.muted, marginBottom: spacing.lg, marginTop: spacing.sm }, grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -spacing.sm, rowGap: spacing.md }, cardSlot: { paddingHorizontal: spacing.sm }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, minHeight: 190, padding: spacing.lg }, icon: { alignItems: "center", borderRadius: radius.lg, height: 58, justifyContent: "center", width: 58 }, explore: { alignItems: "center", flexDirection: "row", gap: spacing.xs, marginTop: "auto", paddingTop: spacing.md }, exploreText: { color: colors.primary, fontSize: 12, fontWeight: "900" }, shopIcon: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.pill, height: 58, justifyContent: "center", width: 58 }, shopInitial: { color: "#fff", fontSize: 23, fontWeight: "900" }, cardTitle: { color: colors.text, fontSize: 17, fontWeight: "900", marginTop: spacing.md }, cardText: { color: colors.muted, lineHeight: 18, marginTop: 5 }, count: { color: colors.primary, fontSize: 11, fontWeight: "900", marginTop: "auto", paddingTop: spacing.md }, error: { color: colors.danger }
});
