import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import type { GestureResponderEvent } from "react-native";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../../ui/tokens";
import { firebaseAuth } from "../../auth/firebase";
import { addWishlistItem, getWishlist, removeWishlistItem } from "../../engagement/engagement.api";
import type { HomeProduct } from "../home.data";

const money = (value: number) => `৳${value.toLocaleString("en-BD")}`;
const fallbackImage = "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=700&h=700&fit=crop";

export function ProductCard({ product }: { product: HomeProduct }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = firebaseAuth?.currentUser ?? null;
  const discount = product.originalPrice ? Math.max(1, Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)) : 0;
  const wishlist = useQuery({ queryKey: ["wishlist"], queryFn: () => getWishlist(user!), enabled: Boolean(user), staleTime: 30_000 });
  const saved = Boolean(wishlist.data?.items.some((item) => item.productId === product.id));
  const toggleWishlist = useMutation({
    mutationFn: () => saved ? removeWishlistItem(user!, product.id) : addWishlistItem(user!, product.id),
    onSuccess: (data) => queryClient.setQueryData(["wishlist"], data)
  });

  function onWishlist(event: GestureResponderEvent) {
    event.stopPropagation();
    if (!user) {
      router.push("/auth" as never);
      return;
    }
    if (!toggleWishlist.isPending) toggleWishlist.mutate();
  }

  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="link" onPress={() => router.push(`/product/${product.slug || product.id}` as never)} style={({ pressed }) => [styles.openArea, pressed && styles.pressed]}>
        <View style={styles.imageWrap}>
          <Image accessibilityLabel={product.title} resizeMode="cover" source={{ uri: product.image || fallbackImage }} style={styles.image} />
          <View style={styles.topBadge}>{discount ? <Text style={styles.discountText}>-{discount}%</Text> : <Text style={styles.verifiedText}>VERIFIED</Text>}</View>
        </View>
        <View style={styles.body}>
          {product.badge ? <Text numberOfLines={1} style={styles.badge}>{product.badge}</Text> : null}
          <Text numberOfLines={2} style={styles.title}>{product.title}</Text>
          <View style={styles.shopRow}><Ionicons color={colors.success} name="checkmark-circle" size={12} /><Text numberOfLines={1} style={styles.shop}>{product.shop}</Text></View>
          <View style={styles.priceRow}><Text style={styles.price}>{money(product.price)}</Text>{product.originalPrice ? <Text style={styles.original}>{money(product.originalPrice)}</Text> : null}</View>
          <View style={styles.metaRow}><Ionicons color="#f59e0b" name="star" size={13} /><Text style={styles.rating}>{product.rating}</Text><Text style={styles.sold}>{product.sold} sold</Text><View style={styles.cart}><Ionicons color={colors.surface} name="add" size={17} /></View></View>
        </View>
      </Pressable>
      <Pressable accessibilityLabel={`${saved ? "Remove" : "Save"} ${product.title} ${saved ? "from" : "to"} wishlist`} accessibilityRole="button" disabled={toggleWishlist.isPending} onPress={onWishlist} style={[styles.heart, saved && styles.heartActive, toggleWishlist.isPending && styles.heartBusy]}>
        <Ionicons color={saved ? colors.surface : colors.accent} name={saved ? "heart" : "heart-outline"} size={18} />
      </Pressable>
    </View>
  );
}

const cardShadow = Platform.select({ web: { boxShadow: "0 10px 24px rgba(15,23,42,0.08)" }, default: { elevation: 4, shadowColor: "#0f172a", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 14 } });
const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: "#edf1f5", borderRadius: radius.md, borderWidth: 1, flex: 1, overflow: "hidden", position: "relative", ...cardShadow },
  openArea: { flex: 1 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  imageWrap: { aspectRatio: 1, backgroundColor: "#f5f7fb", position: "relative", width: "100%" },
  image: { height: "100%", width: "100%" },
  topBadge: { backgroundColor: colors.accent, borderRadius: 4, left: 7, paddingHorizontal: 7, paddingVertical: 5, position: "absolute", top: 7 },
  discountText: { color: colors.surface, fontSize: 9, fontWeight: "700" },
  verifiedText: { color: colors.surface, fontSize: 8, fontWeight: "700" },
  heart: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.96)", borderColor: "#fff", borderRadius: radius.pill, borderWidth: 1, height: 32, justifyContent: "center", position: "absolute", right: 7, top: 7, width: 32 },
  heartActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  heartBusy: { opacity: 0.65 },
  body: { flex: 1, padding: spacing.sm },
  badge: { alignSelf: "flex-start", backgroundColor: colors.accentSoft, borderRadius: 3, color: colors.accent, fontSize: 8, fontWeight: "700", marginBottom: 6, paddingHorizontal: 5, paddingVertical: 3, textTransform: "uppercase" },
  title: { color: colors.text, fontSize: 13, fontWeight: "600", lineHeight: 18, minHeight: 36 },
  shopRow: { alignItems: "center", flexDirection: "row", gap: 3, marginTop: 4 },
  shop: { color: colors.muted, flex: 1, fontSize: 10, fontWeight: "700" },
  priceRow: { alignItems: "baseline", flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  price: { color: colors.accent, fontSize: 18, fontWeight: "700" },
  original: { color: "#94a3b8", fontSize: 10, textDecorationLine: "line-through" },
  metaRow: { alignItems: "center", borderTopColor: "#f1f5f9", borderTopWidth: 1, flexDirection: "row", marginTop: 8, paddingTop: 8 },
  rating: { color: colors.text, fontSize: 10, fontWeight: "600", marginLeft: 3 },
  sold: { color: colors.muted, fontSize: 9, marginLeft: 6 },
  cart: { alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.sm, height: 29, justifyContent: "center", marginLeft: "auto", width: 31 }
});
