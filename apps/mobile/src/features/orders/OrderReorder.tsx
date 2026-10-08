import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { randomUUID } from "expo-crypto";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { colors, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { useCurrentUser } from "../auth/use-current-user";
import { getProduct } from "../catalog/catalog.api";
import { addCartItem } from "../commerce/commerce.api";
import { reorderItems, type ReorderItem } from "./reorder-items";
import { reorderRecovery } from "./reorder-recovery.storage";

export function OrderReorder({ items }: { items: ReorderItem[] }) {
  const user = useCurrentUser();
  const router = useRouter();
  const cache = useQueryClient();
  const [repeatConfirmation, setRepeatConfirmation] = useState(false);
  const operationLock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const current = () => mounted.current && Boolean(user) && firebaseAuth?.currentUser?.uid === user?.uid;
  const mutation = useMutation({ retry: false, mutationFn: async (repeat: boolean) => {
    if (!user || !current()) throw new Error("Sign in again to reorder.");
    if (operationLock.current) throw new Error("A reorder is already running.");
    operationLock.current = true;
    try {
    if (repeat) {
      if (items.length !== 1 || !repeatConfirmation) throw new Error("Confirm the individual item before adding it again.");
      const item = items[0]!;
      const previous = await reorderRecovery.load(user.uid, item.id);
      if (!previous?.completed || !current()) throw new Error("Check the saved reorder before starting another.");
      await reorderRecovery.restartCompleted(user.uid, item.id, previous.key, randomUUID());
      if (current()) setRepeatConfirmation(false);
    }
    return await reorderItems(user.uid, items, { isCurrentAccount: current, loadProduct: getProduct, recovery: {
      load: (item) => reorderRecovery.load(user.uid, item.id),
      prepare: (item) => reorderRecovery.prepare(user.uid, item.id, { variantId: item.variantId, quantity: item.quantity }, randomUUID()),
      complete: (item, key) => reorderRecovery.complete(user.uid, item.id, key)
    }, addVariant: async (variantId, quantity, key) => {
      if (!current()) throw new Error("Your account changed.");
      const cart = await addCartItem(user, variantId, quantity, key);
      if (current()) cache.setQueryData(["cart", user.uid], cart);
    } });
    } finally { operationLock.current = false; }
  } });
  return <View style={{ gap: spacing.sm }}>
    <Text style={{ color: colors.muted }}>Add the same variants and quantities at current prices. Unavailable items are skipped; review your cart before checkout.</Text>
    <Pressable accessibilityRole="button" disabled={!user || mutation.isPending || Boolean(mutation.data)} onPress={() => mutation.mutate(false)} style={{ minHeight: 44, padding: spacing.sm }}><Text style={{ color: colors.primary }}>{mutation.isPending ? "Checking items…" : mutation.data ? "Reorder checked" : items.length === 1 ? "Buy again" : "Reorder these items"}</Text></Pressable>
    {mutation.error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{mutation.error.message}</Text> : null}
    {mutation.data?.map((item) => <Text key={item.id} style={{ color: colors.text }}>{item.productName}: {item.status.replaceAll("-", " ")}</Text>)}
    {mutation.data?.some((item) => item.status === "unconfirmed") ? <Pressable accessibilityRole="button" disabled={mutation.isPending} onPress={() => mutation.mutate(false)} style={{ minHeight: 44, padding: spacing.sm }}><Text style={{ color: colors.primary }}>Recover saved reorder</Text></Pressable> : null}
    {items.length === 1 && mutation.data?.every((item) => ["added", "previously-added"].includes(item.status)) ? <View style={{ gap: spacing.sm }}>{repeatConfirmation ? <><Text style={{ color: colors.text }}>This adds another {items[0]!.quantity} unit(s), in addition to anything already in your cart. Continue?</Text><Pressable accessibilityRole="button" disabled={mutation.isPending} onPress={() => mutation.mutate(true)} style={{ minHeight: 44, padding: spacing.sm }}><Text style={{ color: colors.primary }}>Confirm another addition</Text></Pressable><Pressable accessibilityRole="button" disabled={mutation.isPending} onPress={() => setRepeatConfirmation(false)} style={{ minHeight: 44, padding: spacing.sm }}><Text style={{ color: colors.text }}>Keep current cart</Text></Pressable></> : <Pressable accessibilityRole="button" disabled={mutation.isPending} onPress={() => setRepeatConfirmation(true)} style={{ minHeight: 44, padding: spacing.sm }}><Text style={{ color: colors.primary }}>Add this item again</Text></Pressable>}</View> : null}
    {mutation.data ? <><Text style={{ color: colors.muted }}>Saved requests reuse their original key for up to 23 hours. Previously added items are not added again. If recovery fails, check your cart or contact support.</Text><Pressable accessibilityRole="link" onPress={() => router.push("/cart")} style={{ minHeight: 44, padding: spacing.sm }}><Text style={{ color: colors.primary }}>Review cart</Text></Pressable></> : null}
  </View>;
}
