import type { GrowthFeedDto } from "@amiyo/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ImageBackground, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../../ui/tokens";

type Banner = GrowthFeedDto["banners"][number];
const fallbackImage = "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1600&h=800&fit=crop";

export function HeroBanner({ banner, desktop }: { banner?: Banner; desktop: boolean }) {
  const router = useRouter();
  const destination = banner?.targetValue || "/search";
  const openDestination = () => banner?.targetType === "url" ? Linking.openURL(destination) : router.push(destination as never);
  const imageUrl = (desktop ? banner?.imageUrl : banner?.mobileImageUrl || banner?.imageUrl) || fallbackImage;
  return (
    <ImageBackground imageStyle={styles.image} source={{ uri: imageUrl }} style={[styles.hero, desktop && styles.desktopHero]}>
      <View style={styles.overlay} />
      <View style={styles.content}>
        <View style={styles.badge}><Text style={styles.badgeText}>{banner?.badgeText || "MARKETPLACE PICKS"}</Text></View>
        <Text style={[styles.title, desktop && styles.desktopTitle]}>{banner?.title || "Shop smarter across Bangladesh"}</Text>
        <Text style={styles.subtitle}>{banner?.subtitle || "Trusted sellers, fresh deals and everyday essentials—delivered to your door."}</Text>
        <Pressable accessibilityRole="button" onPress={openDestination} style={styles.cta}><Text style={styles.ctaText}>{banner?.ctaLabel || "Shop now"}</Text><Ionicons color={colors.surface} name="arrow-forward" size={17} /></Pressable>
      </View>
      <View style={styles.dots}><View style={[styles.dot, styles.activeDot]} /><View style={styles.dot} /><View style={styles.dot} /></View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.lg, height: 330, justifyContent: "center", overflow: "hidden" },
  desktopHero: { height: 430 },
  image: { borderRadius: radius.lg },
  overlay: { backgroundColor: "rgba(26,26,46,0.67)", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  content: { maxWidth: 650, padding: spacing.lg, zIndex: 1 },
  badge: { alignSelf: "flex-start", backgroundColor: colors.accent, borderRadius: radius.sm, marginBottom: 14, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { color: colors.surface, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  title: { color: colors.surface, fontSize: 34, fontWeight: "900", letterSpacing: -1.1, lineHeight: 39, maxWidth: 530 },
  desktopTitle: { fontSize: 52, lineHeight: 57 },
  subtitle: { color: "rgba(255,255,255,0.86)", fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 500 },
  cta: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: 8, marginTop: 22, paddingHorizontal: 18, paddingVertical: 12 },
  ctaText: { color: colors.surface, fontSize: 14, fontWeight: "900" },
  dots: { bottom: 12, flexDirection: "row", gap: 6, justifyContent: "center", left: 0, position: "absolute", right: 0 },
  dot: { backgroundColor: "rgba(255,255,255,0.55)", borderRadius: radius.pill, height: 6, width: 6 },
  activeDot: { backgroundColor: colors.surface, width: 20 }
});
