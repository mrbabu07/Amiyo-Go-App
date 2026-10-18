import type { ShopSummaryDto } from "@amiyo/contracts";
import { useRouter } from "expo-router";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "../../../ui/tokens";

export function ShopRail({ shops }: { shops: ShopSummaryDto[] }) {
  const router = useRouter();
  return <ScrollView contentContainerStyle={styles.content} horizontal showsHorizontalScrollIndicator={false}>{shops.map((shop) => <Pressable accessibilityLabel={`Open ${shop.name} shop`} accessibilityRole="link" key={shop.id} onPress={() => router.push(`/shop/${shop.slug}` as never)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>{shop.logoUrl ? <Image source={{ uri: shop.logoUrl }} style={styles.logo} /> : <View style={styles.fallback}><Text style={styles.initial}>{shop.name.slice(0, 1).toUpperCase()}</Text></View>}<View style={styles.copy}><Text numberOfLines={1} style={styles.name}>{shop.name}</Text><Text numberOfLines={2} style={styles.description}>{shop.description || "Verified Amiyo-Go seller"}</Text><Text style={styles.count}>{shop.productCount} products</Text></View></Pressable>)}</ScrollView>;
}

const shadow = Platform.select({ web: { boxShadow: "0 9px 24px rgba(11,31,58,.08)" }, default: { elevation: 3, shadowColor: colors.navy, shadowOffset: { height: 7, width: 0 }, shadowOpacity: 0.08, shadowRadius: 14 } });
const styles = StyleSheet.create({
  content: { gap: 12, paddingBottom: 3 },
  card: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, flexDirection: "row", gap: 12, minHeight: 112, padding: 14, width: 270, ...shadow },
  pressed: { opacity: 0.9, transform: [{ translateY: 1 }] },
  logo: { borderRadius: radius.pill, height: 64, width: 64 },
  fallback: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.pill, height: 64, justifyContent: "center", width: 64 },
  initial: { color: colors.surface, fontSize: 25, fontWeight: "700" },
  copy: { flex: 1 }, name: { color: colors.text, fontSize: 15, fontWeight: "700" }, description: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 4 }, count: { color: colors.primary, fontSize: 10, fontWeight: "700", marginTop: 7 }
});
