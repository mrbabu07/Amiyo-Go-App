import { Ionicons } from "@expo/vector-icons";
import type { StoreOfferDto } from "@amiyo/contracts";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../../ui/tokens";

const seenNative = new Set<string>();
function alreadySeen(key: string) { if (Platform.OS !== "web") return seenNative.has(key); try { return sessionStorage.getItem(key) === "1"; } catch { return false; } }
function remember(key: string) { if (Platform.OS !== "web") { seenNative.add(key); return; } try { sessionStorage.setItem(key, "1"); } catch {} }

export function OfferPopup({ offers, scope }: { offers: StoreOfferDto[]; scope: "home" | `shop:${string}` }) {
  const router = useRouter();
  const offer = useMemo(() => offers.find((item) => item.showAsPopup), [offers]);
  const key = offer ? `amiyo:offer-popup:${scope}:${offer.id}` : "";
  const [visible, setVisible] = useState(false);
  useEffect(() => { if (offer && !alreadySeen(key)) setVisible(true); }, [key, offer]);
  if (!offer) return null;
  const close = () => { remember(key); setVisible(false); };
  const open = () => { close(); router.push(offer.href as never); };
  const discount = offer.discountType === "PERCENT" ? `${offer.value}% OFF` : `৳${offer.value.toLocaleString("en-BD")} OFF`;
  return <Modal animationType="fade" onRequestClose={close} transparent visible={visible}><View style={styles.backdrop}><View accessibilityViewIsModal style={styles.card}>
    <Pressable accessibilityLabel="Close offer" accessibilityRole="button" onPress={close} style={styles.close}><Ionicons color={colors.text} name="close" size={21} /></Pressable>
    {offer.imageUrl ? <Image accessibilityLabel={offer.title} resizeMode="cover" source={{ uri: offer.imageUrl }} style={styles.image} /> : <View style={styles.art}><Ionicons color={colors.surface} name="gift" size={52} /></View>}
    <View style={styles.copy}><Text style={styles.shop}>{offer.shopName.toUpperCase()}</Text><Text style={styles.discount}>{discount}</Text><Text style={styles.title}>{offer.title}</Text>{offer.subtitle ? <Text style={styles.subtitle}>{offer.subtitle}</Text> : null}
      <View style={styles.codeRow}><Text style={styles.codeLabel}>USE CODE</Text><Text selectable style={styles.code}>{offer.code}</Text></View>
      <Pressable accessibilityRole="button" onPress={open} style={styles.cta}><Text style={styles.ctaText}>{offer.ctaLabel}</Text><Ionicons color={colors.onPrimary} name="arrow-forward" size={17} /></Pressable>
    </View>
  </View></View></Modal>;
}

const styles = StyleSheet.create({ backdrop: { alignItems: "center", backgroundColor: "rgba(5,11,20,.72)", flex: 1, justifyContent: "center", padding: spacing.lg }, card: { backgroundColor: colors.surface, borderRadius: radius.xl, boxShadow: "0 24px 70px rgba(5,11,20,.28)", maxWidth: 430, overflow: "hidden", position: "relative", width: "100%" }, close: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.pill, height: 40, justifyContent: "center", position: "absolute", right: 12, top: 12, width: 40, zIndex: 2 }, image: { height: 210, width: "100%" }, art: { alignItems: "center", backgroundColor: colors.navy, height: 180, justifyContent: "center" }, copy: { alignItems: "center", padding: spacing.xl }, shop: { color: colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 1.1 }, discount: { color: colors.primary, fontSize: 30, fontWeight: "700", marginTop: 6 }, title: { color: colors.text, fontSize: 22, fontWeight: "700", marginTop: 5, textAlign: "center" }, subtitle: { color: colors.muted, lineHeight: 20, marginTop: 7, textAlign: "center" }, codeRow: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: 10 }, codeLabel: { color: colors.muted, fontSize: 9, fontWeight: "700" }, code: { color: colors.text, fontSize: 16, fontWeight: "700", letterSpacing: 1.2 }, cta: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: 7, justifyContent: "center", marginTop: spacing.md, minHeight: 48, width: "100%" }, ctaText: { color: colors.onPrimary, fontWeight: "700" } });
