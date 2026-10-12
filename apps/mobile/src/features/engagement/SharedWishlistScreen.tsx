import { Ionicons } from "@expo/vector-icons";
import { sharedWishlistSchema } from "@amiyo/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { z } from "zod";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { ensureGuestUser } from "../auth/guest-auth";
import { useCurrentUser } from "../auth/use-current-user";
import { getProduct } from "../catalog/catalog.api";
import { quickCartVariant } from "../catalog/product-card-policy";
import { addCartItem } from "../commerce/commerce.api";
import { addWishlistItem, getSharedWishlist, getWishlist, removeWishlistItem } from "./engagement.api";

type SharedItem = z.infer<typeof sharedWishlistSchema>["items"][number];
const money = (minor: string) => `৳${(Number(minor) / 100).toLocaleString("en-BD")}`;

export function SharedWishlistScreen({ token }: { token: string }) {
  const router = useRouter();
  const query = useQuery({ queryKey: ["wishlist", "shared", token], queryFn: () => getSharedWishlist(token), enabled: Boolean(token) });
  return <Screen eyebrow="SHARED COLLECTION" title={query.data?.name || "Shared wishlist"} description={query.data ? `${query.data.items.length} shared item${query.data.items.length === 1 ? "" : "s"} · This time-limited link is view only.` : "Browse products shared through a time-limited Amiyo-Go link."}>
    {query.isLoading ? <ActivityIndicator color={colors.primary} size="large" /> : null}
    {query.error ? <View style={styles.state}><Ionicons color={colors.danger} name="link-outline" size={38} /><Text style={styles.error}>{query.error.message}</Text><Pressable onPress={() => router.replace("/")} style={styles.primary}><Text style={styles.primaryText}>Browse Amiyo-Go</Text></Pressable></View> : null}
    {query.data?.items.length ? <View style={styles.grid}>{query.data.items.map((item) => <SharedWishlistCard item={item} key={item.productId} />)}</View> : null}
    {query.data?.items.length === 0 ? <View style={styles.state}><Ionicons color={colors.primary} name="heart-outline" size={46} /><Text style={styles.title}>This wishlist is empty</Text><Text style={styles.muted}>The owner has not saved any products yet.</Text><Pressable onPress={() => router.replace("/")} style={styles.primary}><Text style={styles.primaryText}>Browse products</Text></Pressable></View> : null}
  </Screen>;
}

function SharedWishlistCard({ item }: { item: SharedItem }) {
  const router = useRouter();
  const cache = useQueryClient();
  const user = useCurrentUser();
  const [failedImage, setFailedImage] = useState(false);
  const stockLabel = item.availableQuantity === 0 ? "Out of stock" : item.availableQuantity <= 5 ? `Only ${item.availableQuantity} left` : "In stock";
  const wishlist = useQuery({ queryKey: ["wishlist", user?.uid ?? null], queryFn: () => getWishlist(user!), enabled: Boolean(user), staleTime: 30_000 });
  const saved = Boolean(wishlist.data?.items.some((entry) => entry.productId === item.productId));
  const toggleWishlist = useMutation({ retry: false, mutationFn: () => saved ? removeWishlistItem(user!, item.productId) : addWishlistItem(user!, item.productId), onMutate: () => user?.uid, onSuccess: (data, _variables, uid) => {
    if (!uid || firebaseAuth?.currentUser?.uid !== uid) return;
    cache.setQueryData(["wishlist", uid], data);
    void cache.invalidateQueries({ queryKey: ["wishlist-collections", uid] });
  } });
  const add = useMutation({ retry: false, mutationFn: async () => {
    const detail = await getProduct(item.slug || item.productId);
    const variantId = quickCartVariant(detail.variants);
    if (!variantId) { router.push(`/product/${item.slug || item.productId}` as never); return null; }
    const user = firebaseAuth?.currentUser || await ensureGuestUser();
    const cart = await addCartItem(user, variantId, 1);
    return { cart, uid: user.uid };
  }, onSuccess: (result) => { if (result && firebaseAuth?.currentUser?.uid === result.uid) cache.setQueryData(["cart", result.uid], result.cart); } });
  function onWishlist() {
    if (!user) { router.push("/auth" as never); return; }
    if (!toggleWishlist.isPending) toggleWishlist.mutate();
  }
  return <View style={styles.card}>
    <Pressable accessibilityRole="link" accessibilityLabel={`View ${item.name}`} onPress={() => router.push(`/product/${item.slug}` as never)}>
      {item.thumbnailUrl && !failedImage ? <Image accessibilityLabel={item.name} onError={() => setFailedImage(true)} resizeMode="cover" source={{ uri: item.thumbnailUrl }} style={styles.image} /> : <View accessibilityLabel="Product image unavailable" accessibilityRole="image" style={[styles.image, styles.imageFallback]}><Ionicons color={colors.muted} name="image-outline" size={38} /></View>}
      <View style={styles.copy}><Text numberOfLines={2} style={styles.title}>{item.name}</Text><View style={styles.row}><Text style={styles.price}>{item.price ? money(item.price.amountMinor) : "Currently unavailable"}</Text><Text style={[styles.stock, item.availableQuantity === 0 ? styles.stockOut : item.availableQuantity <= 5 ? styles.stockLow : styles.stockIn]}>{stockLabel}</Text></View></View>
    </Pressable>
    <Pressable accessibilityLabel={`${saved ? "Remove" : "Save"} ${item.name} ${saved ? "from" : "to"} wishlist`} accessibilityRole="button" accessibilityState={{ busy: toggleWishlist.isPending, selected: saved }} disabled={toggleWishlist.isPending} onPress={onWishlist} style={[styles.heart, saved && styles.heartActive, toggleWishlist.isPending && styles.disabled]}><Ionicons color={saved ? colors.surface : colors.accent} name={saved ? "heart" : "heart-outline"} size={19} /></Pressable>
    <View style={styles.actions}><Pressable accessibilityRole="button" accessibilityLabel={`Add ${item.name} to cart`} disabled={add.isPending || item.availableQuantity === 0 || !item.price} onPress={() => add.mutate()} style={[styles.primary, styles.flex, (add.isPending || item.availableQuantity === 0 || !item.price) && styles.disabled]}><Ionicons color="#fff" name="cart-outline" size={18} /><Text style={styles.primaryText}>{add.isPending ? "Adding…" : item.availableQuantity === 0 ? "Out of stock" : "Add to cart"}</Text></Pressable><Pressable accessibilityRole="link" accessibilityLabel={`Open ${item.name}`} onPress={() => router.push(`/product/${item.slug}` as never)} style={styles.secondary}><Text style={styles.secondaryText}>View</Text></Pressable></View>
    {add.error ? <Text accessibilityRole="alert" style={styles.error}>{add.error.message}</Text> : null}{toggleWishlist.error ? <Text accessibilityRole="alert" style={styles.error}>{toggleWishlist.error.message}</Text> : null}{add.isSuccess && add.data ? <Text accessibilityLiveRegion="polite" style={styles.success}>Added to cart</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, card: { backgroundColor: colors.surface, borderRadius: radius.lg, flexBasis: 250, flexGrow: 1, maxWidth: 360, minWidth: 0, overflow: "hidden", position: "relative" }, image: { aspectRatio: 1.15, backgroundColor: colors.background, width: "100%" }, imageFallback: { alignItems: "center", justifyContent: "center" }, copy: { gap: spacing.sm, padding: spacing.md }, row: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" }, actions: { alignItems: "center", flexDirection: "row", gap: spacing.sm, padding: spacing.sm }, heart: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.pill, height: 44, justifyContent: "center", position: "absolute", right: spacing.sm, top: spacing.sm, width: 44 }, heartActive: { backgroundColor: colors.accent }, state: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.xl, gap: spacing.md, padding: spacing.xl }, title: { color: colors.text, fontSize: 16, fontWeight: "600" }, muted: { color: colors.muted, textAlign: "center" }, price: { color: colors.primary, fontSize: 18, fontWeight: "700" }, stock: { borderRadius: 999, fontSize: 11, fontWeight: "600", overflow: "hidden", paddingHorizontal: spacing.sm, paddingVertical: 4 }, stockIn: { backgroundColor: colors.accentSoft, color: colors.success }, stockLow: { backgroundColor: colors.primarySoft, color: colors.warning }, stockOut: { backgroundColor: colors.primarySoft, color: colors.danger }, error: { color: colors.danger, paddingHorizontal: spacing.md, paddingBottom: spacing.sm }, success: { color: colors.success, paddingHorizontal: spacing.md, paddingBottom: spacing.sm }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: 6, justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.md }, primaryText: { color: "#fff", fontWeight: "600" }, secondary: { alignItems: "center", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.md }, secondaryText: { color: colors.text, fontWeight: "600" }, disabled: { opacity: 0.55 }
});
