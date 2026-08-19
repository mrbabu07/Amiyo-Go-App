import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../../ui/tokens";

type Promo = { title: string; subtitle: string; href: string; icon: string; tone: string };

export function PromoTiles({ campaigns, couponCode }: { campaigns: Array<{ name: string; href: string }>; couponCode?: string }) {
  const router = useRouter();
  const promos: Promo[] = [
    { title: campaigns[0]?.name || "Marketplace offers", subtitle: "Explore verified deals", href: campaigns[0]?.href || "/search", icon: "sparkles-outline", tone: colors.primary },
    { title: couponCode || "Trusted sellers", subtitle: couponCode ? "Apply at checkout" : "Shop verified stores", href: couponCode ? "/cart" : "/shops", icon: couponCode ? "ticket-outline" : "storefront-outline", tone: colors.accent }
  ];
  return <View style={styles.rail}>{promos.map((promo) => <Pressable accessibilityRole="button" key={promo.title} onPress={() => router.push(promo.href as never)} style={[styles.tile, { backgroundColor: promo.tone }]}><View style={styles.icon}><Ionicons color={colors.surface} name={promo.icon as never} size={24} /></View><View><Text style={styles.kicker}>DISCOVER MORE</Text><Text numberOfLines={2} style={styles.title}>{promo.title}</Text><Text style={styles.subtitle}>{promo.subtitle}  ›</Text></View></Pressable>)}</View>;
}

const styles = StyleSheet.create({
  rail: { gap: spacing.md, width: 260 },
  tile: { borderRadius: radius.lg, flex: 1, justifyContent: "space-between", minHeight: 150, overflow: "hidden", padding: spacing.lg },
  icon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.17)", borderRadius: radius.pill, height: 46, justifyContent: "center", width: 46 },
  kicker: { color: "rgba(255,255,255,0.72)", fontSize: 9, fontWeight: "700", letterSpacing: 0.8, marginTop: spacing.md },
  title: { color: colors.surface, fontSize: 19, fontWeight: "700", lineHeight: 23, marginTop: 4 },
  subtitle: { color: colors.surface, fontSize: 11, fontWeight: "600", marginTop: 7 }
});
