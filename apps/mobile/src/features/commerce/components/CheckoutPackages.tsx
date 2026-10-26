import type { CheckoutQuote } from "@amiyo/contracts";
import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, View } from "react-native";
import { formatMinor } from "../../../ui/money";
import { colors, radius, spacing } from "../../../ui/tokens";

const fallbackImage = "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=300&h=300&fit=crop";

export function groupCheckoutItemsByShop(quote: CheckoutQuote) {
  const groups = new Map<string, CheckoutQuote["cart"]["items"]>();
  for (const item of quote.cart.items) groups.set(item.shopId, [...(groups.get(item.shopId) || []), item]);
  return Array.from(groups, ([shopId, items]) => ({ shopId, shopName: items[0]?.shopName || "Marketplace seller", items, subtotalMinor: items.reduce((total, item) => total + BigInt(item.lineTotal.amountMinor), 0n).toString() }));
}

export function CheckoutPackages({ quote }: { quote: CheckoutQuote }) {
  const packages = groupCheckoutItemsByShop(quote);
  return <View style={styles.packages}>
    <View style={styles.heading}><Text style={styles.title}>Seller packages</Text><Text style={styles.count}>{packages.length}</Text></View>
    {packages.map((shopPackage) => <View key={shopPackage.shopId} style={styles.package}>
      <View style={styles.shopRow}><View style={styles.shopIcon}><Ionicons color={colors.primary} name="storefront-outline" size={17} /></View><View style={styles.shopCopy}><Text numberOfLines={1} style={styles.shopName}>{shopPackage.shopName}</Text><Text style={styles.shopMeta}>{shopPackage.items.length} product{shopPackage.items.length === 1 ? "" : "s"} · packed separately</Text></View><Text style={styles.packageTotal}>{formatMinor(shopPackage.subtotalMinor)}</Text></View>
      {shopPackage.items.map((item) => <View key={item.id} style={styles.item}><Image accessibilityLabel={item.productName} resizeMode="cover" source={{ uri: item.thumbnailUrl || fallbackImage }} style={styles.image} /><View style={styles.itemCopy}><Text numberOfLines={2} style={styles.productName}>{item.productName}</Text><Text numberOfLines={1} style={styles.variant}>{item.variantTitle} · Qty {item.quantity}</Text></View><Text style={styles.lineTotal}>{formatMinor(item.lineTotal.amountMinor)}</Text></View>)}
      <View style={styles.note}><Ionicons color={colors.accent} name="cube-outline" size={15} /><Text style={styles.noteText}>This seller prepares and dispatches this package independently.</Text></View>
    </View>)}
  </View>;
}

const styles = StyleSheet.create({ packages: { gap: spacing.sm }, heading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, title: { color: colors.text, fontSize: 14, fontWeight: "700" }, count: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, color: colors.primary, fontSize: 11, fontWeight: "700", minWidth: 25, paddingHorizontal: 8, paddingVertical: 4, textAlign: "center" }, package: { backgroundColor: colors.background, borderRadius: radius.lg, gap: spacing.sm, padding: spacing.sm }, shopRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm }, shopIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 34, justifyContent: "center", width: 34 }, shopCopy: { flex: 1, minWidth: 0 }, shopName: { color: colors.text, fontSize: 13, fontWeight: "700" }, shopMeta: { color: colors.muted, fontSize: 10, marginTop: 2 }, packageTotal: { color: colors.primary, fontSize: 13, fontWeight: "700" }, item: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: 7 }, image: { backgroundColor: colors.accentSoft, borderRadius: radius.sm, height: 48, width: 48 }, itemCopy: { flex: 1, minWidth: 0 }, productName: { color: colors.text, fontSize: 12, fontWeight: "600", lineHeight: 16 }, variant: { color: colors.muted, fontSize: 10, marginTop: 3 }, lineTotal: { color: colors.text, fontSize: 12, fontWeight: "700" }, note: { alignItems: "center", flexDirection: "row", gap: 6, paddingHorizontal: 2 }, noteText: { color: colors.muted, flex: 1, fontSize: 9, lineHeight: 13 } });
