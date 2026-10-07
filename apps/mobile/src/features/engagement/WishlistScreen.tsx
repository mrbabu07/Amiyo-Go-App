import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { useCurrentUser } from "../auth/use-current-user";
import { getProduct } from "../catalog/catalog.api";
import { quickCartVariant } from "../catalog/product-card-policy";
import { addCartItem } from "../commerce/commerce.api";
import { getWishlist, removeWishlistItem, shareWishlist, unshareWishlist } from "./engagement.api";

import { WishlistCollections, WishlistCollectionPicker } from "./WishlistCollections";
import { WishlistToCart } from "./WishlistToCart";
import { ProductAlertControls } from "./ProductAlertControls";

type WishlistItem = Awaited<ReturnType<typeof getWishlist>>["items"][number];
const money = (minor: string) => `৳${(Number(minor) / 100).toLocaleString("en-BD")}`;

export function WishlistScreen() {
  const router = useRouter();
  const cache = useQueryClient();
  const user = useCurrentUser();
  const [selection, setSelection] = useState<{ uid: string; id?: string } | null>(null);
  const collectionId = selection?.uid === user?.uid ? selection?.id : undefined;
  const wishlistKey = collectionId ? ["wishlist", user?.uid ?? null, collectionId] : ["wishlist", user?.uid ?? null];
  const selectCollection = (id?: string) => { if (user) setSelection({ uid: user.uid, id }); };
  const { width } = useWindowDimensions();
  const compact = width < 1024;
  const [shareError, setShareError] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const query = useQuery({ queryKey: wishlistKey, queryFn: () => getWishlist(user!, collectionId), enabled: Boolean(user) });
  const updateShare = useMutation({ mutationFn: () => query.data?.shareUrl ? unshareWishlist(user!, collectionId) : shareWishlist(user!, collectionId), onMutate: () => ({ uid: user?.uid, key: wishlistKey }), onSuccess: (data, _variables, context) => { if (context?.uid && firebaseAuth?.currentUser?.uid === context.uid) { cache.setQueryData(context.key, data); void cache.invalidateQueries({ queryKey: ["wishlist-collections", context.uid] }); } } });
  const remove = useMutation({ mutationFn: (productId: string) => removeWishlistItem(user!, productId, collectionId), onMutate: () => ({ uid: user?.uid, key: wishlistKey }), onSuccess: (data, _variables, context) => { if (context?.uid && firebaseAuth?.currentUser?.uid === context.uid) { cache.setQueryData(context.key, data); void cache.invalidateQueries({ queryKey: ["wishlist-collections", context.uid] }); } } });

  async function openShare() {
    if (!query.data?.shareUrl) return;
    setShareError("");
    try {
      await Share.share({ title: "My Amiyo-Go wishlist", message: `See my Amiyo-Go wishlist: ${query.data.shareUrl}`, url: query.data.shareUrl });
    } catch {
      setShareError("Could not open sharing. You can copy the link below.");
    }
  }

  if (!user) return <WishlistState title="Save your favourites" copy="Sign in to keep products together and share a private wishlist." action="Sign in" onPress={() => router.replace("/auth")} />;
  if (query.isLoading) return <WishlistState loading title="Loading your wishlist" copy="Collecting your saved products." />;
  if (query.error || !query.data) return <WishlistState title="Could not load wishlist" copy={query.error instanceof Error ? query.error.message : "Please try again."} action="Try again" onPress={() => query.refetch()} />;

  return <Screen hideHeading title="My wishlist">
    <View style={[styles.header, compact && styles.stacked]}>
      <View style={styles.headingRow}>
        <Pressable accessibilityRole="link" accessibilityLabel="Back to home" onPress={() => router.push("/")} style={styles.iconButton}><Ionicons color={colors.text} name="arrow-back" size={23} /></Pressable>
        <View style={styles.flex}><Text accessibilityRole="header" style={styles.title}>My wishlist</Text><Text style={styles.muted}>{query.data.items.length} saved item{query.data.items.length === 1 ? "" : "s"}</Text></View>
      </View>
      <Pressable accessibilityRole="link" onPress={() => router.push("/cart")} style={styles.secondary}><Ionicons color={colors.text} name="cart-outline" size={20} /><Text style={styles.secondaryText}>View cart</Text></Pressable>
    </View>
    <View style={[styles.workspace, compact && styles.stacked]}>
      <View style={[styles.sidebar, compact && styles.fullWidth]}>
        <WishlistCollections key={`${user.uid}:${collectionId || "default"}`} selectedId={collectionId} onSelect={selectCollection} />
        <View style={styles.panel}>
          <View style={styles.headingRow}><Ionicons color={colors.text} name={query.data.shareUrl ? "globe-outline" : "lock-closed-outline"} size={23} /><Text style={styles.sectionTitle}>{query.data.shareUrl ? "Sharing is active" : "Your list is private"}</Text></View>
          <Text style={styles.muted}>{query.data.shareUrl ? "Anyone with this link can view the list for up to 30 days." : "Generate a link when you want to share your saved products."}</Text>
          {query.data.shareUrl ? <><Text numberOfLines={2} selectable style={styles.url}>{query.data.shareUrl}</Text><Pressable accessibilityRole="button" onPress={openShare} style={styles.primary}><Ionicons color="#fff" name="share-social-outline" size={18} /><Text style={styles.primaryText}>Share link</Text></Pressable></> : null}
          <Pressable accessibilityRole="button" accessibilityState={{ busy: updateShare.isPending }} disabled={updateShare.isPending} onPress={() => { setShareError(""); updateShare.mutate(); }} style={styles.secondary}><Text style={query.data.shareUrl ? styles.dangerText : styles.secondaryText}>{updateShare.isPending ? "Updating…" : query.data.shareUrl ? "Revoke link" : "Generate share link"}</Text></Pressable>
          {updateShare.error || shareError ? <Text accessibilityRole="alert" style={styles.error}>{updateShare.error?.message || shareError}</Text> : null}
        </View>
      </View>
      <View style={[styles.content, compact && styles.fullWidth]}>
        <View style={styles.panel}><Text accessibilityRole="header" style={styles.sectionTitle}>{query.data.name || "All saved items"}</Text><Text style={styles.muted}>Choose a product to view options, or add it directly to your cart.</Text>{query.data.items.length ? <WishlistToCart key={`${user.uid}:${query.data.id}`} products={query.data.items} busy={bulkBusy} onBusyChange={setBulkBusy} /> : null}</View>
        {query.data.items.length ? <View style={styles.grid}>{query.data.items.map((item) => <WishlistCard key={`${user.uid}:${item.productId}`} busy={remove.isPending || bulkBusy} collectionId={query.data.id} item={item} onOpen={() => router.push(`/product/${item.slug || item.productId}` as never)} onRemove={() => remove.mutate(item.productId)} />)}</View> : <View style={styles.empty}><Ionicons color={colors.primary} name="heart-outline" size={52} /><Text style={styles.emptyTitle}>Your wishlist is empty</Text><Text style={styles.muted}>Tap the heart on a product to save it here.</Text><Pressable accessibilityRole="link" onPress={() => router.replace("/")} style={styles.primary}><Text style={styles.primaryText}>Explore products</Text></Pressable></View>}
        {remove.error ? <Text accessibilityRole="alert" style={styles.error}>{remove.error.message}</Text> : null}
      </View>
    </View>
  </Screen>;
}

function WishlistCard({ busy, collectionId, item, onOpen, onRemove }: { busy: boolean; collectionId: string; item: WishlistItem; onOpen: () => void; onRemove: () => void }) {
  const cache = useQueryClient();
  const user = useCurrentUser();
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const addToCart = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to add products to your cart.");
      const detail = await getProduct(item.slug || item.productId);
      const variantId = quickCartVariant(detail.variants);
      if (firebaseAuth?.currentUser?.uid !== user.uid) throw new Error("Your account changed. Please try again.");
      if (!variantId) { onOpen(); return null; }
      return { cart: await addCartItem(user, variantId, 1), uid: user.uid };
    },
    onSuccess: (result) => {
      if (result && firebaseAuth?.currentUser?.uid === result.uid) cache.setQueryData(["cart", result.uid], result.cart);
    }
  });

  return <View style={styles.card}>
    <Pressable accessibilityRole="link" accessibilityLabel={`Open ${item.name}`} onPress={onOpen} style={styles.openArea}>
      {item.thumbnailUrl && failedImage !== item.thumbnailUrl ? <Image accessibilityLabel={item.name} resizeMode="contain" source={{ uri: item.thumbnailUrl }} onError={() => setFailedImage(item.thumbnailUrl)} style={styles.image} /> : <View accessibilityRole="image" accessibilityLabel="Product image unavailable" style={[styles.image, styles.imageFallback]}><Ionicons color={colors.muted} name="image-outline" size={36} /></View>}
      <View style={styles.cardCopy}><Text numberOfLines={2} style={styles.productName}>{item.name}</Text><Text style={styles.added}>Saved {new Date(item.addedAt).toLocaleDateString("en-BD", { day: "numeric", month: "short" })}</Text><Text style={styles.price}>{item.price ? money(item.price.amountMinor) : "Currently unavailable"}</Text></View>
    </Pressable>
    <View style={styles.cardActions}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Add ${item.name} to cart`} accessibilityState={{ busy: addToCart.isPending }} disabled={busy || addToCart.isPending || !item.price} onPress={() => addToCart.mutate()} style={[styles.primary, styles.cartButton, (busy || addToCart.isPending || !item.price) && styles.disabled]}><Ionicons color="#fff" name="cart-outline" size={18} /><Text style={styles.primaryText}>{addToCart.isPending ? "Adding…" : "Add to cart"}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.name} from wishlist`} accessibilityState={{ busy }} disabled={busy} onPress={onRemove} style={[styles.iconButton, busy && styles.disabled]}><Ionicons color={colors.danger} name="trash-outline" size={20} /></Pressable>
    </View>
    <WishlistCollectionPicker productId={item.productId} selectedId={collectionId} />
    <ProductAlertControls productId={item.productId} productName={item.name} />
    {addToCart.error ? <Text accessibilityRole="alert" style={styles.feedbackError}>{addToCart.error.message}</Text> : null}
    {addToCart.isSuccess && addToCart.data ? <Text accessibilityLiveRegion="polite" style={styles.feedback}>Added to cart</Text> : null}
  </View>;
}

function WishlistState({ action, copy, loading, onPress, title }: { action?: string; copy: string; loading?: boolean; onPress?: () => void; title: string }) {
  return <Screen eyebrow="SAVED ITEMS" title={title} description={copy}><View style={styles.empty}>{loading ? <ActivityIndicator color={colors.primary} size="large" /> : <Ionicons color={colors.primary} name="heart-outline" size={52} />}{action && onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={styles.primary}><Text style={styles.primaryText}>{action}</Text></Pressable> : null}</View></Screen>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  headingRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { color: colors.text, fontSize: 28, fontWeight: "600" },
  workspace: { flexDirection: "row", alignItems: "flex-start", gap: spacing.lg },
  stacked: { flexDirection: "column", alignItems: "stretch" },
  sidebar: { width: 280, gap: spacing.md },
  content: { flex: 1, minWidth: 0, gap: spacing.md },
  fullWidth: { width: "100%", flexGrow: 0, flexShrink: 0, flexBasis: "auto" },
  panel: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "600", flexShrink: 1 },
  selectedList: { backgroundColor: colors.primarySoft, padding: spacing.md, borderRadius: radius.md, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  count: { color: colors.text, fontWeight: "700" },
  muted: { color: colors.muted, lineHeight: 20 },
  url: { backgroundColor: colors.primarySoft, borderRadius: radius.md, color: colors.text, fontSize: 12, padding: spacing.sm },
  primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: 6, justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  primaryText: { color: "#fff", fontWeight: "600", flexShrink: 1 },
  secondary: { alignItems: "center", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: 6, justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.md },
  secondaryText: { color: colors.text, fontWeight: "600" },
  dangerText: { color: colors.danger, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, flexBasis: 260, flexGrow: 1, flexShrink: 1, minWidth: 0, maxWidth: 360, overflow: "hidden" },
  openArea: { flex: 1 },
  image: { backgroundColor: colors.background, aspectRatio: 1.25, width: "100%" },
  imageFallback: { alignItems: "center", justifyContent: "center" },
  cardCopy: { gap: 5, padding: spacing.md },
  productName: { color: colors.text, fontSize: 16, fontWeight: "600", minHeight: 40 },
  added: { color: colors.muted, fontSize: 12 },
  price: { color: colors.primary, fontSize: 18, fontWeight: "700" },
  cardActions: { alignItems: "center", flexDirection: "row", gap: spacing.sm, padding: spacing.sm },
  cartButton: { flex: 1 },
  iconButton: { alignItems: "center", justifyContent: "center", minHeight: 44, minWidth: 44 },
  disabled: { opacity: 0.6 },
  feedback: { color: colors.success, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  feedbackError: { color: colors.danger, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  empty: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.md, padding: spacing.lg },
  emptyTitle: { color: colors.text, fontSize: 22, fontWeight: "600" },
  error: { color: colors.danger, padding: spacing.sm }
});
