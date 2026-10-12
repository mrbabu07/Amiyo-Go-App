import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { useCurrentUser } from "../auth/use-current-user";
import { getProduct } from "../catalog/catalog.api";
import { addCartItem } from "../commerce/commerce.api";
import { wishlistToCart, type WishlistCartProduct } from "./wishlist-to-cart";
import { wishlistCartRecovery } from "./wishlist-cart-recovery.storage";
import type { WishlistCartReceipt } from "./wishlist-cart-recovery";

const statusLabels = {
  added: "Added to cart",
  "choose-options": "Choose options",
  "out-of-stock": "Out of stock",
  unavailable: "Could not check availability",
  unconfirmed: "Not confirmed — check your cart",
  "not-attempted": "Not attempted"
};

export function WishlistToCart({ collectionId, products, busy, onBusyChange }: { collectionId: string; products: WishlistCartProduct[]; busy: boolean; onBusyChange: (busy: boolean) => void }) {
  const user = useCurrentUser();
  const cache = useQueryClient();
  const router = useRouter();
  const [receipt, setReceipt] = useState<WishlistCartReceipt | null | undefined>(undefined);
  const [recoveryError, setRecoveryError] = useState("");
  const productIds = products.map((item) => item.productId);
  useEffect(() => {
    let active = true;
    if (!user) { setReceipt(null); return () => { active = false; }; }
    void wishlistCartRecovery.load(user.uid, collectionId).then((value) => { if (active && firebaseAuth?.currentUser?.uid === user.uid) { setRecoveryError(""); setReceipt(value); } }).catch((error) => { if (active) { setRecoveryError(error instanceof Error ? error.message : "Could not read saved wishlist progress."); setReceipt(null); } });
    return () => { active = false; };
  }, [collectionId, user]);
  const mutation = useMutation({
    retry: false,
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to add your wishlist to cart.");
      const uid = user.uid;
      const saved = await wishlistCartRecovery.prepare(uid, collectionId, productIds);
      if (saved.completed) throw new Error("This wishlist copy already completed. Start another copy explicitly if you want to add one more of each item.");
      const result = await wishlistToCart(uid, [...products], {
        isCurrentAccount: () => firebaseAuth?.currentUser?.uid === uid,
        loadProduct: getProduct,
        addVariant: async (variantId, productId) => {
          if (firebaseAuth?.currentUser?.uid !== uid) throw new Error("Your account changed.");
          const cart = await addCartItem(user, variantId, 1, saved.keys[productId]);
          if (firebaseAuth?.currentUser?.uid === uid) cache.setQueryData(["cart", uid], cart);
        }
      });
      if (!result.accountChanged && !result.items.some((item) => ["unconfirmed", "not-attempted"].includes(item.status))) setReceipt(await wishlistCartRecovery.complete(uid, collectionId, productIds));
      else setReceipt(saved);
      return { uid, ...result };
    },
    onSuccess: (result) => {
      if (firebaseAuth?.currentUser?.uid === result.uid) void cache.invalidateQueries({ queryKey: ["cart", result.uid] });
    },
    onMutate: () => onBusyChange(true),
    onSettled: () => onBusyChange(false)
  });
  const result = mutation.data?.uid === user?.uid ? mutation.data : null;
  const unconfirmed = result?.items.some((item) => item.status === "unconfirmed");
  async function startAgain() {
    if (!user) return;
    try {
      const next = await wishlistCartRecovery.restartCompleted(user.uid, collectionId, productIds);
      if (firebaseAuth?.currentUser?.uid === user.uid) { setRecoveryError(""); setReceipt(next); mutation.reset(); }
    } catch (error) {
      setRecoveryError(error instanceof Error ? error.message : "Could not restart wishlist-to-cart.");
    }
  }
  return <View style={styles.panel}>
    <Text style={styles.copy}>Add one of each available single-option product. Products with choices stay saved for you to select separately.</Text>
    {receipt === undefined ? <ActivityIndicator color={colors.primary} /> : null}
    <Pressable accessibilityRole="button" accessibilityState={{ busy: mutation.isPending }} disabled={!products.length || busy || mutation.isPending || receipt === undefined || Boolean(recoveryError) || Boolean(result && !unconfirmed) || Boolean(receipt?.completed)} onPress={() => mutation.mutate()} style={[styles.button, (!products.length || busy || mutation.isPending || receipt === undefined || Boolean(recoveryError) || Boolean(result && !unconfirmed) || Boolean(receipt?.completed)) && styles.disabled]}><Text style={styles.buttonText}>{mutation.isPending ? "Adding wishlist…" : unconfirmed || (receipt && !receipt.completed) ? "Resume safely" : receipt?.completed ? "Wishlist already copied" : "Wishlist to Cart"}</Text></Pressable>
    {recoveryError ? <Text accessibilityRole="alert" style={styles.error}>{recoveryError}</Text> : null}
    {mutation.error ? <Text accessibilityRole="alert" style={styles.error}>{mutation.error.message}</Text> : null}
    {result ? <View style={styles.results}>
      <Text accessibilityLiveRegion="polite" style={styles.copy}>{result.items.filter((item) => item.status === "added").length} added. Your saved lists are unchanged.</Text>
      {unconfirmed ? <Text accessibilityRole="alert" style={styles.error}>We stopped after an unconfirmed request. Check your cart before adding anything again; the last item may already be there.</Text> : null}
      {result.accountChanged ? <Text style={styles.error}>Stopped because your account changed.</Text> : null}
      {result.items.map((item) => <View key={item.productId} style={styles.item}><Text style={styles.name}>{item.name}</Text><Text style={styles.copy}>{statusLabels[item.status]}</Text>{item.status === "choose-options" ? <Pressable accessibilityRole="link" accessibilityLabel={`Choose options for ${item.name}`} onPress={() => router.push(`/product/${item.slug || item.productId}` as never)} style={styles.link}><Text style={styles.name}>Choose options</Text></Pressable> : null}</View>)}
      <Pressable accessibilityRole="link" onPress={() => router.push("/cart")} style={styles.link}><Text style={styles.name}>Review cart</Text></Pressable>
    </View> : null}
    {receipt?.completed ? <Pressable accessibilityRole="button" onPress={() => void startAgain()} style={styles.link}><Text style={styles.name}>Start another copy</Text></Pressable> : null}
  </View>;
}

const styles = StyleSheet.create({
  panel: { gap: spacing.sm },
  copy: { color: colors.muted, lineHeight: 20 },
  name: { color: colors.text, fontWeight: "600" },
  error: { color: colors.danger, lineHeight: 20 },
  button: { backgroundColor: colors.primary, borderRadius: radius.md, alignItems: "center", justifyContent: "center", minHeight: 44, padding: spacing.sm },
  buttonText: { color: "#fff", fontWeight: "600" },
  disabled: { opacity: 0.6 },
  results: { gap: spacing.sm },
  item: { backgroundColor: colors.background, borderRadius: radius.sm, padding: spacing.sm, gap: 4 },
  link: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.sm }
});
