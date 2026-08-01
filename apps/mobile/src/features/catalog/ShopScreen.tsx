import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { ProductCard } from "../home/components/ProductCard";
import { StoreHeader } from "../home/components/StoreHeader";
import { getShop } from "./catalog.api";
import { toHomeProduct } from "./catalog.view-model";

export function ShopScreen({ identifier }: { identifier: string }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const columns = width >= 1180 ? 5 : width >= 820 ? 4 : 2;
  const result = useQuery({ queryKey: ["catalog", "shop", identifier], queryFn: () => getShop(identifier) });
  return <SafeAreaView style={styles.safe}><ScrollView><StoreHeader desktop={width >= 900} viewportWidth={width} /><View style={styles.content}><Pressable onPress={() => router.back()}><Text style={styles.link}>‹ Back</Text></Pressable>{result.isLoading ? <ActivityIndicator color={colors.primary} size="large" /> : null}{result.data ? <><View style={styles.hero}><View style={styles.logo}><Text style={styles.logoText}>{result.data.name.slice(0, 1)}</Text></View><View><Text accessibilityRole="header" style={styles.title}>{result.data.name}</Text><Text style={styles.description}>{result.data.description || "Verified Amiyo-Go shop"}</Text><Text style={styles.count}>{result.data.productCount} products</Text></View></View><View style={styles.grid}>{result.data.products.data.map(toHomeProduct).map((product) => <View key={product.id} style={[styles.slot, { width: `${100 / columns}%` as `${number}%` }]}><ProductCard product={product} /></View>)}</View></> : null}{result.error ? <Text style={styles.error}>Shop could not be loaded.</Text> : null}</View></ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { backgroundColor: colors.background, flex: 1 }, content: { alignSelf: "center", maxWidth: 1208, padding: spacing.lg, width: "100%" }, link: { color: colors.primary, fontWeight: "900" }, hero: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", gap: spacing.lg, marginBottom: spacing.xl, marginTop: spacing.lg, padding: spacing.xl }, logo: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.pill, height: 72, justifyContent: "center", width: 72 }, logoText: { color: "#fff", fontSize: 30, fontWeight: "900" }, title: { color: "#fff", fontSize: 28, fontWeight: "900" }, description: { color: "#cbd5e1", marginTop: 5 }, count: { color: "#7dd3fc", fontSize: 11, fontWeight: "900", marginTop: 8 }, grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6, rowGap: 12 }, slot: { paddingHorizontal: 6 }, error: { color: colors.danger } });
