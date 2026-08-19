import type { ShopSummaryDto } from "@amiyo/contracts";
import { useRouter } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "../../../ui/tokens";

export function ShopRail({ shops }: { shops: ShopSummaryDto[] }) {
  const router = useRouter();
  return <ScrollView contentContainerStyle={styles.content} horizontal showsHorizontalScrollIndicator={false}>{shops.map((shop) => <Pressable accessibilityLabel={`Open ${shop.name} shop`} accessibilityRole="button" key={shop.id} onPress={() => router.push(`/shop/${shop.slug}` as never)} style={styles.card}>{shop.logoUrl ? <Image source={{ uri: shop.logoUrl }} style={styles.logo} /> : <View style={styles.fallback}><Text style={styles.initial}>{shop.name.slice(0, 1).toUpperCase()}</Text></View>}<View style={styles.copy}><Text numberOfLines={1} style={styles.name}>{shop.name}</Text><Text numberOfLines={2} style={styles.description}>{shop.description || "Verified Amiyo-Go seller"}</Text><Text style={styles.count}>{shop.productCount} products</Text></View></Pressable>)}</ScrollView>;
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingBottom: 3 },
  card: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", gap: 12, minHeight: 112, padding: 14, width: 270 },
  logo: { borderRadius: radius.pill, height: 64, width: 64 },
  fallback: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.pill, height: 64, justifyContent: "center", width: 64 },
  initial: { color: colors.surface, fontSize: 25, fontWeight: "700" },
  copy: { flex: 1 }, name: { color: colors.text, fontSize: 15, fontWeight: "700" }, description: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 4 }, count: { color: colors.primary, fontSize: 10, fontWeight: "700", marginTop: 7 }
});
