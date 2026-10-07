import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { useCurrentUser } from "../auth/use-current-user";
import { getProduct } from "../catalog/catalog.api";
import { addCartItem } from "../commerce/commerce.api";
import { wishlistToCart, type WishlistCartProduct } from "./wishlist-to-cart";

const statusLabels = {
  added: "Added to cart",
  "choose-options": "Choose options",
  "out-of-stock": "Out of stock",
  unavailable: "Could not check availability",
  unconfirmed: "Not confirmed — check your cart",
  "not-attempted": "Not attempted"
};

export function WishlistToCart({ products, busy, onBusyChange }: { products: WishlistCartProduct[]; busy: boolean; onBusyChange: (busy: boolean) => void }) {
  const user = useCurrentUser();
  const cache = useQueryClient();
  const router = useRouter();
  const mutation = useMutation({
    retry: false,
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to add your wishlist to cart.");
      const uid = user.uid;
      const result = await wishlistToCart(uid, [...products], {
        isCurrentAccount: () => firebaseAuth?.currentUser?.uid === uid,
        loadProduct: getProduct,
        addVariant: async (variantId) => {
          if (firebaseAuth?.currentUser?.uid !== uid) throw new Error("Your account changed.");
          const cart = await addCartItem(user, variantId, 1);
          if (firebaseAuth?.currentUser?.uid === uid) cache.setQueryData(["cart", uid], cart);
        }
      });
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
  return <View style={styles.panel}>
    <Text style={styles.copy}>Add one of each available single-option product. Products with choices stay saved for you to select separately.</Text>
    <Pressable accessibilityRole="button" accessibilityState={{ busy: mutation.isPending }} disabled={!products.length || busy || mutation.isPending || Boolean(result)} onPress={() => mutation.mutate()} style={[styles.button, (!products.length || busy || mutation.isPending || Boolean(result)) && styles.disabled]}><Text style={styles.buttonText}>{mutation.isPending ? "Adding wishlist…" : result ? "Wishlist checked" : "Wishlist to Cart"}</Text></Pressable>
    {mutation.error ? <Text accessibilityRole="alert" style={styles.error}>{mutation.error.message}</Text> : null}
    {result ? <View style={styles.results}>
      <Text accessibilityLiveRegion="polite" style={styles.copy}>{result.items.filter((item) => item.status === "added").length} added. Your saved lists are unchanged.</Text>
      {unconfirmed ? <Text accessibilityRole="alert" style={styles.error}>We stopped after an unconfirmed request. Check your cart before adding anything again; the last item may already be there.</Text> : null}
      {result.accountChanged ? <Text style={styles.error}>Stopped because your account changed.</Text> : null}
      {result.items.map((item) => <View key={item.productId} style={styles.item}><Text style={styles.name}>{item.name}</Text><Text style={styles.copy}>{statusLabels[item.status]}</Text>{item.status === "choose-options" ? <Pressable accessibilityRole="link" accessibilityLabel={`Choose options for ${item.name}`} onPress={() => router.push(`/product/${item.slug || item.productId}` as never)} style={styles.link}><Text style={styles.name}>Choose options</Text></Pressable> : null}</View>)}
      <Pressable accessibilityRole="link" onPress={() => router.push("/cart")} style={styles.link}><Text style={styles.name}>Review cart</Text></Pressable>
    </View> : null}
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
