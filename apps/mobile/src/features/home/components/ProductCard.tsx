import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useRef } from "react";
import type { GestureResponderEvent } from "react-native";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../../ui/tokens";
import { formatMinor } from "../../../ui/money";
import { firebaseAuth } from "../../auth/firebase";
import { useCurrentUser } from "../../auth/use-current-user";
import { ensureGuestUser } from "../../auth/guest-auth";
import { getProduct } from "../../catalog/catalog.api";
import { productDiscount, quickCartVariant } from "../../catalog/product-card-policy";
import { addCartItem } from "../../commerce/commerce.api";
import { addWishlistItem, getWishlist, removeWishlistItem } from "../../engagement/engagement.api";
import { getDiscoverySessionId, safelyRecordDiscoveryEvent } from "../../catalog/discovery.api";
import type { HomeProduct } from "../home.data";
import { useMarketplaceLocale } from "../../platform/marketplace-locale";
import { useLowDataMode } from "../../platform/use-low-data-mode";

const money = (value: string) => formatMinor(value);
const fallbackImage = "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=700&h=700&fit=crop";

export function ProductCard({ lowData = false, product }: { lowData?: boolean; product: HomeProduct }) {
  const router = useRouter();
  const { t } = useMarketplaceLocale();
  const { enabled: policyLowData } = useLowDataMode();
  const dataSaver = lowData || policyLowData;
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const activeUid = useRef(user?.uid); activeUid.current = user?.uid;
  const discount = productDiscount(product.priceMinor, product.originalPriceMinor);
  const wishlist = useQuery({ queryKey: ["wishlist", user?.uid ?? null], queryFn: () => getWishlist(user!), enabled: Boolean(user), staleTime: 30_000 });
  const saved = Boolean(wishlist.data?.items.some((item) => item.productId === product.id));
  const addToCart = useMutation({
    mutationFn: async () => {
      const detail = await getProduct(product.slug || product.id);
      const variantId = quickCartVariant(detail.variants);
      if (!variantId) {
        router.push(`/product/${product.slug || product.id}` as never);
        return null;
      }
      const currentUser = firebaseAuth?.currentUser || await ensureGuestUser();
      return { cart: await addCartItem(currentUser, variantId, 1), uid: currentUser.uid };
    },
    onSuccess: (result) => {
      if (!result || firebaseAuth?.currentUser?.uid !== result.uid) return;
      queryClient.setQueryData(["cart", result.uid], result.cart);
      void getDiscoverySessionId().then((sessionId) => safelyRecordDiscoveryEvent({ sessionId, eventType: "ADD_TO_CART", productId: product.id }));
    }
  });
  const toggleWishlist = useMutation({
    mutationFn: () => saved ? removeWishlistItem(user!, product.id) : addWishlistItem(user!, product.id),
    onMutate: () => user?.uid,
    onSuccess: (data, _variables, uid) => {
      if (!uid || activeUid.current !== uid) return;
      queryClient.setQueryData(["wishlist", uid], data);
      void queryClient.invalidateQueries({ queryKey: ["wishlist-collections", uid] });
      if (!saved) void getDiscoverySessionId().then((sessionId) => safelyRecordDiscoveryEvent({ sessionId, eventType: "WISHLIST", productId: product.id }));
    }
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
          {dataSaver ? <View accessibilityLabel={`${product.title} image hidden to save data`} accessibilityRole="image" style={[styles.image, styles.lowDataImage]}><Ionicons color={colors.accent} name="leaf-outline" size={26} /><Text style={styles.lowDataLabel}>DATA SAVER</Text></View> : <Image accessibilityLabel={product.title} resizeMode="cover" source={{ uri: product.image || fallbackImage }} style={styles.image} />}
          <View style={styles.topBadge}>{discount ? <Text style={styles.discountText}>-{discount}%</Text> : <Text style={styles.verifiedText}>VERIFIED</Text>}</View>
        </View>
        <View style={styles.body}>
          {product.badge ? <Text numberOfLines={1} style={styles.badge}>{product.badge}</Text> : null}
          <Text numberOfLines={2} style={styles.title}>{product.title}</Text>
          <View style={styles.shopRow}><Ionicons color={colors.success} name="checkmark-circle" size={12} /><Text numberOfLines={1} style={styles.shop}>{product.shop}</Text></View>
          <View style={styles.priceRow}><Text style={styles.price}>{money(product.priceMinor)}</Text>{product.originalPriceMinor ? <Text style={styles.original}>{money(product.originalPriceMinor)}</Text> : null}</View>
          <View style={styles.metaRow}><Ionicons color="#f59e0b" name="star" size={13} /><Text style={styles.rating}>{product.rating}</Text><Text style={styles.sold}>{product.reviewCount} reviews</Text></View>
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Add ${product.title} to cart`} accessibilityState={{ busy: addToCart.isPending }} disabled={addToCart.isPending} onPress={() => addToCart.mutate()} style={({ pressed }) => [styles.cart, (pressed || addToCart.isPending) && styles.heartBusy]}>
        <Ionicons color={colors.onPrimary} name="cart-outline" size={17} />
        <Text style={styles.cartLabel}>{addToCart.isPending ? t.adding : t.addCart}</Text>
      </Pressable>
      {addToCart.isError ? <Text accessibilityRole="alert" style={styles.cartError}>{addToCart.error instanceof Error ? addToCart.error.message : "Could not add item. Try again."}</Text> : null}
      {addToCart.isSuccess && addToCart.data ? <Text accessibilityLiveRegion="polite" style={styles.cartFeedback}>Added to cart</Text> : null}
      <Pressable accessibilityLabel={`${saved ? "Remove" : "Save"} ${product.title} ${saved ? "from" : "to"} wishlist`} accessibilityRole="button" disabled={toggleWishlist.isPending} onPress={onWishlist} style={[styles.heart, saved && styles.heartActive, toggleWishlist.isPending && styles.heartBusy]}>
        <Ionicons color={saved ? colors.onPrimary : colors.accent} name={saved ? "heart" : "heart-outline"} size={18} />
      </Pressable>
    </View>
  );
}

const cardShadow = Platform.select({ web: { boxShadow: "0 12px 30px rgba(11,31,58,0.10)" }, default: { elevation: 4, shadowColor: colors.navy, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16 } });
const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, flex: 1, overflow: "hidden", position: "relative", ...cardShadow },
  openArea: { flex: 1 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  imageWrap: { aspectRatio: 1, backgroundColor: colors.primarySoft, position: "relative", width: "100%" },
  image: { height: "100%", width: "100%" }, lowDataImage: { alignItems: "center", backgroundColor: colors.accentSoft, justifyContent: "center" }, lowDataLabel: { color: colors.accent, fontSize: 9, fontWeight: "700", marginTop: 5 },
  topBadge: { backgroundColor: colors.accent, borderRadius: 4, left: 7, paddingHorizontal: 7, paddingVertical: 5, position: "absolute", top: 7 },
  discountText: { color: colors.surface, fontSize: 9, fontWeight: "700" },
  verifiedText: { color: colors.surface, fontSize: 8, fontWeight: "700" },
  heart: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.96)", borderRadius: radius.pill, height: 36, justifyContent: "center", position: "absolute", right: 7, top: 7, width: 36 },
  heartActive: { backgroundColor: colors.accent },
  heartBusy: { opacity: 0.65 },
  body: { flex: 1, padding: spacing.sm },
  badge: { alignSelf: "flex-start", backgroundColor: colors.accentSoft, borderRadius: 3, color: colors.accent, fontSize: 8, fontWeight: "700", marginBottom: 6, paddingHorizontal: 5, paddingVertical: 3, textTransform: "uppercase" },
  title: { color: colors.text, fontSize: 13, fontWeight: "600", lineHeight: 18, minHeight: 36 },
  shopRow: { alignItems: "center", flexDirection: "row", gap: 3, marginTop: 4 },
  shop: { color: colors.muted, flex: 1, fontSize: 10, fontWeight: "700" },
  priceRow: { alignItems: "baseline", flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  price: { color: colors.accent, fontSize: 18, fontWeight: "700" },
  original: { color: "#94a3b8", fontSize: 10, textDecorationLine: "line-through" },
  metaRow: { alignItems: "center", flexDirection: "row", marginTop: 8, paddingTop: 4 },
  rating: { color: colors.text, fontSize: 10, fontWeight: "600", marginLeft: 3 },
  sold: { color: colors.muted, fontSize: 9, marginLeft: 6 },
  cart: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.sm, minHeight: 44, justifyContent: "center", flexDirection: "row", gap: 6, marginHorizontal: spacing.sm, marginBottom: spacing.sm, paddingHorizontal: 6, paddingVertical: 10 },
  cartLabel: { color: colors.onPrimary, fontSize: 12, fontWeight: "600", flexShrink: 1 },
  cartError: { color: colors.danger, fontSize: 11, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  cartFeedback: { color: colors.success, fontSize: 11, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm }
});
