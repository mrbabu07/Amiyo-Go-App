import type { GrowthFeedDto } from "@amiyo/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ImageBackground, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../../ui/tokens";

type Banner = GrowthFeedDto["banners"][number];
const fallbackImage = "https://images.unsplash.com/photo-1607082350899-7e105aa886ae?w=1600&h=850&fit=crop";

export function HeroBanner({ banner, desktop }: { banner?: Banner; desktop: boolean }) {
  const router = useRouter();
  const destination = banner?.targetValue || "/search";
  const openDestination = () => banner?.targetType === "url" ? Linking.openURL(destination) : router.push(destination as never);
  const imageUrl = (desktop ? banner?.imageUrl : banner?.mobileImageUrl || banner?.imageUrl) || fallbackImage;
  return <ImageBackground imageStyle={styles.image} source={{ uri: imageUrl }} style={[styles.hero, desktop && styles.desktopHero]}>
    <View style={styles.overlay} />
    <View style={styles.content}>
      <View style={styles.badge}><Ionicons color="#fff" name="flash" size={13} /><Text style={styles.badgeText}>{banner?.badgeText || "HOT DEALS"}</Text></View>
      <Text style={[styles.title, desktop && styles.desktopTitle]}>{banner?.title || "Premium picks, daily deals"}</Text>
      <Text style={styles.subtitle}>{banner?.subtitle || "Shop verified sellers, flash offers, fast delivery and secure checkout across Bangladesh."}</Text>
      <View style={styles.actions}><Pressable accessibilityRole="button" onPress={openDestination} style={styles.cta}><Text style={styles.ctaText}>{banner?.ctaLabel || "Shop now"}</Text><Ionicons color={colors.surface} name="arrow-forward" size={17} /></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/categories" as never)} style={styles.secondary}><Text style={styles.secondaryText}>All categories</Text></Pressable></View>
    </View>
    <View style={styles.stats}><Stat label="Verified sellers" value="100%" /><Stat label="Secure pay" value="SSL" /><Stat label="Deals" value="Daily" /></View>
  </ImageBackground>;
}

function Stat({ label, value }: { label: string; value: string }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({
  hero: { borderRadius: radius.lg, height: 340, justifyContent: "center", overflow: "hidden" },
  desktopHero: { height: 430 },
  image: { borderRadius: radius.lg },
  overlay: { backgroundColor: "rgba(11,18,32,0.62)", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  content: { maxWidth: 650, padding: spacing.lg, zIndex: 1 },
  badge: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.accent, borderRadius: radius.sm, flexDirection: "row", gap: 5, marginBottom: 14, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { color: colors.surface, fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  title: { color: colors.surface, fontSize: 34, fontWeight: "700", lineHeight: 39, maxWidth: 530 },
  desktopTitle: { fontSize: 52, lineHeight: 58 },
  subtitle: { color: "rgba(255,255,255,0.9)", fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 500 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: 22 },
  cta: { alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.md, flexDirection: "row", gap: 8, minHeight: 46, paddingHorizontal: 18 },
  ctaText: { color: colors.surface, fontSize: 14, fontWeight: "700" },
  secondary: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.14)", borderColor: "rgba(255,255,255,0.4)", borderRadius: radius.md, borderWidth: 1, justifyContent: "center", minHeight: 46, paddingHorizontal: 18 },
  secondaryText: { color: colors.surface, fontSize: 14, fontWeight: "700" },
  stats: { bottom: 14, flexDirection: "row", gap: 8, left: spacing.lg, position: "absolute", right: spacing.lg },
  stat: { backgroundColor: "rgba(255,255,255,0.14)", borderColor: "rgba(255,255,255,0.25)", borderRadius: radius.md, borderWidth: 1, flex: 1, padding: 10 },
  statValue: { color: colors.surface, fontSize: 14, fontWeight: "700" },
  statLabel: { color: "rgba(255,255,255,0.76)", fontSize: 9, fontWeight: "600", marginTop: 2 }
});
