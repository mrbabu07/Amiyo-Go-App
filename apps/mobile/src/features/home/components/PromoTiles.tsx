import { Ionicons } from "@expo/vector-icons";
import type { StoreOfferDto } from "@amiyo/contracts";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../../ui/tokens";

type Promo = { title: string; subtitle: string; href: string; icon: string; tone: string };

export function PromoTiles({ campaigns, couponCode, storeOffers = [] }: { campaigns: Array<{ name: string; href: string }>; couponCode?: string; storeOffers?: StoreOfferDto[] }) {
  const router = useRouter();
  const [position, setPosition] = useState(0);
  useEffect(() => { if (storeOffers.length < 2) return; const timer = setInterval(() => setPosition((current) => (current + 1) % storeOffers.length), 4_000); return () => clearInterval(timer); }, [storeOffers.length]);
  const fallbacks: Promo[] = [
    { title: campaigns[0]?.name || "Marketplace offers", subtitle: "Explore verified deals", href: campaigns[0]?.href || "/search", icon: "sparkles-outline", tone: colors.primary },
    { title: couponCode || "Trusted sellers", subtitle: couponCode ? "Apply at checkout" : "Shop verified stores", href: couponCode ? "/cart" : "/shops", icon: couponCode ? "ticket-outline" : "storefront-outline", tone: colors.accent }
  ];
  const promos = [0, 1].map((offset) => storeOffers.length ? storeOffers[(position + offset) % storeOffers.length]! : fallbacks[offset]!);
  return <View style={styles.rail}>{promos.map((promo, index) => { const offer = "code" in promo ? promo : null; return <Pressable accessibilityRole="button" key={`${offer?.id || promo.title}:${index}`} onPress={() => router.push(promo.href as never)} style={[styles.tile, { backgroundColor: offer ? (index ? colors.accent : colors.primary) : ("tone" in promo ? promo.tone : colors.primary) }]}>{offer?.imageUrl ? <Image source={{ uri: offer.imageUrl }} style={styles.image} /> : null}<View style={styles.overlay} /><View style={styles.icon}><Ionicons color={colors.surface} name={(offer ? "gift-outline" : ("icon" in promo ? promo.icon : "gift-outline")) as never} size={24} /></View><View style={styles.copy}><Text style={styles.kicker}>{offer ? offer.shopName.toUpperCase() : "DISCOVER MORE"}</Text><Text numberOfLines={2} style={styles.title}>{promo.title}</Text><Text style={styles.subtitle}>{offer ? `${offer.code} · ${offer.ctaLabel}` : `${promo.subtitle} ›`}</Text></View></Pressable>; })}</View>;
}

const styles = StyleSheet.create({ rail: { gap: spacing.md, width: 260 }, tile: { borderRadius: radius.lg, flex: 1, justifyContent: "space-between", minHeight: 150, overflow: "hidden", padding: spacing.lg, position: "relative" }, image: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, height: "100%", width: "100%" }, overlay: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(5,11,20,.52)" }, icon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.17)", borderRadius: radius.pill, height: 46, justifyContent: "center", width: 46, zIndex: 1 }, copy: { zIndex: 1 }, kicker: { color: "rgba(255,255,255,0.72)", fontSize: 9, fontWeight: "700", letterSpacing: 0.8, marginTop: spacing.md }, title: { color: colors.surface, fontSize: 19, fontWeight: "700", lineHeight: 23, marginTop: 4 }, subtitle: { color: colors.surface, fontSize: 11, fontWeight: "600", marginTop: 7 } });
