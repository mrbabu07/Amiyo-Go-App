import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "../../../ui/tokens";
import type { HomeProduct } from "../home.data";

const money = (value: number) => `৳${value.toLocaleString("en-BD")}`;
const fallbackImage = "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=700&h=700&fit=crop";

export function ProductCard({ product }: { product: HomeProduct }) {
  const router = useRouter();
  const discount = product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/product/${product.slug || product.id}` as never)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.imageWrap}>
        <Image accessibilityLabel={product.title} resizeMode="cover" source={{ uri: product.image || fallbackImage }} style={styles.image} />
        {discount ? <View style={styles.discount}><Text style={styles.discountText}>-{discount}%</Text></View> : null}
        <View style={styles.heart}><Ionicons color={colors.text} name="heart-outline" size={18} /></View>
      </View>
      <View style={styles.body}>
        {product.badge ? <Text numberOfLines={1} style={styles.badge}>{product.badge}</Text> : null}
        <Text numberOfLines={2} style={styles.title}>{product.title}</Text>
        <Text numberOfLines={1} style={styles.shop}>{product.shop}</Text>
        <View style={styles.priceRow}><Text style={styles.price}>{money(product.price)}</Text>{product.originalPrice ? <Text style={styles.original}>{money(product.originalPrice)}</Text> : null}</View>
        <View style={styles.metaRow}><Ionicons color="#f59e0b" name="star" size={13} /><Text style={styles.rating}>{product.rating}</Text><Text style={styles.sold}>{product.sold} sold</Text><View style={styles.cart}><Ionicons color={colors.surface} name="cart-outline" size={16} /></View></View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, overflow: "hidden", ...Platform.select({ web: { boxShadow: "0 3px 8px rgba(15,23,42,0.06)" }, default: { shadowColor: "#0f172a", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8 } }) },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] }, imageWrap: { aspectRatio: 1, backgroundColor: "#f1f5f9", position: "relative", width: "100%" }, image: { height: "100%", width: "100%" },
  discount: { backgroundColor: colors.danger, borderRadius: 4, left: 7, paddingHorizontal: 6, paddingVertical: 4, position: "absolute", top: 7 }, discountText: { color: colors.surface, fontSize: 9, fontWeight: "900" },
  heart: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.93)", borderRadius: radius.pill, height: 32, justifyContent: "center", position: "absolute", right: 7, top: 7, width: 32 },
  body: { flex: 1, padding: 10 }, badge: { alignSelf: "flex-start", backgroundColor: colors.primarySoft, borderRadius: 3, color: colors.primary, fontSize: 8, fontWeight: "900", marginBottom: 6, paddingHorizontal: 5, paddingVertical: 3, textTransform: "uppercase" },
  title: { color: colors.text, fontSize: 13, fontWeight: "800", lineHeight: 18, minHeight: 36 }, shop: { color: colors.muted, fontSize: 10, marginTop: 4 },
  priceRow: { alignItems: "baseline", flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }, price: { color: colors.accent, fontSize: 16, fontWeight: "900" }, original: { color: "#94a3b8", fontSize: 10, textDecorationLine: "line-through" },
  metaRow: { alignItems: "center", flexDirection: "row", marginTop: 8 }, rating: { color: colors.text, fontSize: 10, fontWeight: "700", marginLeft: 3 }, sold: { color: colors.muted, fontSize: 9, marginLeft: 6 }, cart: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.sm, height: 29, justifyContent: "center", marginLeft: "auto", width: 31 }
});
