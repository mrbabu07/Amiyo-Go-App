import type { CreateReturn } from "@amiyo/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { useCurrentUser } from "../auth/use-current-user";
import { CustomerReturnForm } from "../orders/CustomerReturnForm";
import { OrderItemImage } from "../orders/OrderItemImage";
import { getCustomerOrder, getCustomerOrders } from "../orders/orders.api";
import { pendingOrderActions } from "../orders/order-action.storage";
import { mayDiscardOrderRejection } from "../orders/pending-order-action";
import { returnEligibilityMessage } from "../orders/return-eligibility";
import { createCustomerReturn, OperationsRequestError } from "./operations.api";

export function CustomerReturnWizard({ onClose }: { onClose(): void }) {
  const user = useCurrentUser();
  const router = useRouter();
  const cache = useQueryClient();
  const mounted = useRef(true);
  const lock = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const current = () => mounted.current && Boolean(user) && firebaseAuth?.currentUser?.uid === user?.uid;
  const [orderId, setOrderId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [savedRequest, setSavedRequest] = useState(false);
  const orders = useQuery({ queryKey: ["return-order-picker", user?.uid], queryFn: () => getCustomerOrders(user!), enabled: Boolean(user), retry: false });
  const order = useQuery({ queryKey: ["return-order-details", user?.uid, orderId], queryFn: () => getCustomerOrder(user!, orderId), enabled: Boolean(user && orderId), retry: false, refetchOnWindowFocus: false });
  const recovery = useQuery({ queryKey: ["return-order-recovery", user?.uid, orderId], queryFn: () => pendingOrderActions.load(user!.uid, orderId), enabled: Boolean(user && orderId), staleTime: 0 });
  const selected = order.data?.vendorOrders.find((item) => item.id === packageId);
  const pending = savedRequest || Boolean(recovery.data);
  const mutation = useMutation({ retry: false, mutationFn: async (input: CreateReturn) => {
    if (!current() || !selected || input.vendorOrderId !== selected.id || recovery.isLoading || recovery.error || pending) throw new Error("Refresh the order or recover its saved request before continuing.");
    if (lock.current) throw new Error("A return request is already being sent.");
    lock.current = true;
    try {
      const saved = await pendingOrderActions.prepare(user!.uid, orderId, { kind: "return", input }, randomUUID());
      if (current()) setSavedRequest(true);
      if (!current()) throw new Error("Your account changed. Reopen this order.");
      try {
        const result = await createCustomerReturn(user!, input, saved.key);
        await pendingOrderActions.complete(user!.uid, orderId, saved.key);
        return result;
      } catch (error) {
        if (error instanceof OperationsRequestError && mayDiscardOrderRejection(saved.fresh, error.status, error.code)) {
          await pendingOrderActions.complete(user!.uid, orderId, saved.key);
          if (current()) setSavedRequest(false);
        }
        throw error;
      }
    } finally { lock.current = false; }
  }, onSuccess: async () => {
    await cache.invalidateQueries({ queryKey: ["returns"] });
    await cache.invalidateQueries({ queryKey: ["orders"] });
    if (current()) onClose();
  } });
  if (!user) return null;
  return <View style={styles.panel}>
    <Text accessibilityRole="header" style={styles.title}>Start a return</Text>
    <Text style={styles.copy}>Choose an order, then a seller package. Return windows and remaining quantities are checked from its current policy.</Text>
    {orders.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
    {orders.error ? <Button label="Retry loading orders" onPress={() => void orders.refetch()} /> : null}
    {!orders.isLoading && !orders.error && !orders.data?.length ? <Text style={styles.copy}>No orders found in the loaded list.</Text> : null}
    {orders.data?.map((item) => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: orderId === item.id }} disabled={mutation.isPending || pending} onPress={() => { setOrderId(item.id); setPackageId(""); setSavedRequest(false); }} style={[styles.button, orderId === item.id && styles.selected]}><Text style={styles.copy}>#{item.orderNumber} · {item.status.replaceAll("_", " ")}</Text>{item.previewItems.map((product, index) => <View key={`${product.productId}:${index}`} style={styles.product}><OrderItemImage name={product.name} uri={product.thumbnailUrl} /><Text style={styles.productCopy}>{product.name} · Qty {product.quantity}</Text></View>)}</Pressable>)}
    <Text style={styles.copy}>Only the loaded order list is shown. Older orders can also be opened from My Orders.</Text>
    {orderId && (order.isLoading || recovery.isLoading) ? <ActivityIndicator color={colors.primary} /> : null}
    {order.error ? <Button label="Retry order details" onPress={() => void order.refetch()} /> : null}
    {pending || recovery.error ? <View style={styles.notice}><Text style={styles.copy}>A saved request needs checking, or recovery could not be loaded. Open this order to recover it before sending another request.</Text><Button label="Open order recovery" onPress={() => router.push(`/order/${orderId}` as never)} /></View> : null}
    {!pending && !recovery.error ? order.data?.vendorOrders.map((item) => {
      const unavailable = returnEligibilityMessage(item.returnEligibility, Date.now());
      return <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: packageId === item.id, disabled: Boolean(unavailable) || mutation.isPending }} disabled={Boolean(unavailable) || mutation.isPending} onPress={() => setPackageId(item.id)} style={[styles.button, packageId === item.id && styles.selected]}><Text style={styles.copy}>{item.shopName || item.vendorName || "Seller package"}</Text><Text style={styles.copy}>{unavailable || "Available to request a return"}</Text></Pressable>;
    }) : null}
    {selected && (!pending || mutation.isPending) && !recovery.error ? <CustomerReturnForm key={`${user.uid}:${selected.id}`} vendorOrder={selected} busy={mutation.isPending || recovery.isLoading} onSubmit={(input) => mutation.mutateAsync(input)} /> : null}
    {mutation.error ? <Text accessibilityRole="alert" style={styles.error}>{mutation.error.message}</Text> : null}
    <Button label="Close return form" disabled={mutation.isPending} onPress={onClose} />
  </View>;
}

function Button({ label, onPress, disabled }: { label: string; onPress(): void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={styles.button}><Text style={styles.copy}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  panel: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md },
  title: { color: colors.text, fontWeight: "600", fontSize: 22 },
  copy: { color: colors.text, lineHeight: 21, flexShrink: 1 },
  product: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  productCopy: { color: colors.text, lineHeight: 21, flex: 1, minWidth: 0 },
  button: { minHeight: 44, padding: spacing.md, backgroundColor: colors.background, borderRadius: radius.md, gap: spacing.sm },
  selected: { backgroundColor: colors.primarySoft },
  notice: { gap: spacing.sm },
  error: { color: colors.danger }
});
