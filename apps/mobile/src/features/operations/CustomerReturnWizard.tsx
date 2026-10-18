import type { CreateReturn } from "@amiyo/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { CustomerReturnForm } from "../orders/CustomerReturnForm";
import { OrderItemImage } from "../orders/OrderItemImage";
import { getCustomerOrder, getCustomerOrders } from "../orders/orders.api";
import { pendingOrderActions } from "../orders/order-action.storage";
import { mayDiscardOrderRejection } from "../orders/pending-order-action";
import { returnEligibilityMessage } from "../orders/return-eligibility";
import { createCustomerReturn, OperationsRequestError } from "./operations.api";

export function CustomerReturnWizard({ onClose, initialOrderId = "" }: { onClose(): void; initialOrderId?: string }) {
  const user = useCurrentUser();
  const router = useRouter();
  const cache = useQueryClient();
  const mounted = useRef(true);
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;
  const lock = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const ownerUid = user?.uid;
  const current = () => mounted.current && Boolean(ownerUid) && activeUid.current === ownerUid;
  const [orderId, setOrderId] = useState(initialOrderId);
  const [packageId, setPackageId] = useState("");
  const [savedRequest, setSavedRequest] = useState(false);
  const orders = useQuery({ queryKey: ["return-order-picker", user?.uid], queryFn: () => getCustomerOrders(user!), enabled: Boolean(user && !initialOrderId), retry: false });
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
    if (!ownerUid || !current()) return;
    await cache.invalidateQueries({ queryKey: ["returns", ownerUid] });
    await cache.invalidateQueries({ queryKey: ["orders", "customer", ownerUid] });
    if (current()) onClose();
  } });
  if (!user) return null;

  return <View style={styles.panel}>
    <View style={styles.heading}><View style={styles.headingIcon}><Ionicons color={colors.primary} name="return-up-back-outline" size={25} /></View><View style={styles.headingCopy}><Text accessibilityRole="header" style={styles.title}>Start a return</Text><Text style={styles.copy}>{initialOrderId ? "Choose a seller package from this order." : "Choose an order, then a seller package."} Return windows and quantities are verified against the current policy.</Text></View></View>
    {!initialOrderId ? <View style={styles.step}><StepTitle index="1" title="Choose an order" />
      {orders.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {orders.error ? <ActionButton label="Retry loading orders" onPress={() => void orders.refetch()} /> : null}
      {!orders.isLoading && !orders.error && !orders.data?.length ? <Text style={styles.muted}>No orders found in the loaded list.</Text> : null}
      {orders.data?.map((item) => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: orderId === item.id }} disabled={mutation.isPending || pending} onPress={() => { setOrderId(item.id); setPackageId(""); setSavedRequest(false); }} style={[styles.choice, orderId === item.id && styles.selected]}><View style={styles.choiceHeading}><Text style={styles.choiceTitle}>#{item.orderNumber}</Text><Text style={styles.status}>{item.status.replaceAll("_", " ")}</Text></View>{item.previewItems.map((product, index) => <View key={`${product.productId}:${index}`} style={styles.product}><OrderItemImage name={product.name} uri={product.thumbnailUrl} /><Text style={styles.productCopy}>{product.name} · Qty {product.quantity}</Text></View>)}</Pressable>)}
      <Text style={styles.helper}>Only recent loaded orders appear here. Open older orders from My Orders.</Text>
    </View> : null}
    {orderId ? <View style={styles.step}><StepTitle index={initialOrderId ? "1" : "2"} title="Choose a seller package" />
      {order.isLoading || recovery.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {order.error ? <ActionButton label="Retry order details" onPress={() => void order.refetch()} /> : null}
      {pending || recovery.error ? <View style={styles.notice}><Ionicons color={colors.warning} name="warning-outline" size={22} /><View style={styles.noticeCopy}><Text style={styles.choiceTitle}>Saved request needs attention</Text><Text style={styles.muted}>Open this order to safely recover the previous request before sending another one.</Text><ActionButton label="Open order recovery" onPress={() => router.push(`/order/${orderId}` as never)} /></View></View> : null}
      {!pending && !recovery.error ? order.data?.vendorOrders.map((item) => {
        const unavailable = returnEligibilityMessage(item.returnEligibility, Date.now());
        return <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: packageId === item.id, disabled: Boolean(unavailable) || mutation.isPending }} disabled={Boolean(unavailable) || mutation.isPending} onPress={() => setPackageId(item.id)} style={[styles.choice, packageId === item.id && styles.selected, unavailable && styles.unavailable]}><View style={styles.choiceHeading}><Text style={styles.choiceTitle}>{item.shopName || item.vendorName || "Seller package"}</Text><Ionicons color={packageId === item.id ? colors.primary : colors.muted} name={packageId === item.id ? "radio-button-on" : "radio-button-off"} size={21} /></View><Text style={unavailable ? styles.unavailableText : styles.available}>{unavailable || "Available to request a return"}</Text></Pressable>;
      }) : null}
    </View> : null}
    {selected && (!pending || mutation.isPending) && !recovery.error ? <View style={styles.step}><StepTitle index={initialOrderId ? "2" : "3"} title="Return details" /><CustomerReturnForm key={`${user.uid}:${selected.id}`} vendorOrder={selected} busy={mutation.isPending || recovery.isLoading} onSubmit={(input) => mutation.mutateAsync(input)} /></View> : null}
    {mutation.error ? <View accessibilityRole="alert" style={styles.error}><Ionicons color={colors.danger} name="alert-circle-outline" size={20} /><Text style={styles.errorText}>{mutation.error.message}</Text></View> : null}
    <ActionButton label="Close return form" disabled={mutation.isPending} onPress={onClose} secondary />
  </View>;
}

function StepTitle({ index, title }: { index: string; title: string }) { return <View style={styles.stepTitle}><View style={styles.stepIndex}><Text style={styles.stepIndexText}>{index}</Text></View><Text style={styles.stepLabel}>{title}</Text></View>; }

function ActionButton({ label, onPress, disabled, secondary }: { label: string; onPress(): void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.action, secondary && styles.actionSecondary, disabled && styles.disabled]}><Text style={[styles.actionText, secondary && styles.actionTextSecondary]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  panel: { backgroundColor: colors.surface, borderRadius: radius.xl, boxShadow: "0 12px 34px rgba(11,31,58,.10)", gap: spacing.lg, padding: spacing.lg },
  heading: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  headingIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 48, justifyContent: "center", width: 48 },
  headingCopy: { flex: 1, gap: 5 },
  title: { color: colors.text, fontSize: 22, fontWeight: "700" },
  copy: { color: colors.text, flexShrink: 1, lineHeight: 21 },
  muted: { color: colors.muted, flexShrink: 1, lineHeight: 20 },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  step: { gap: spacing.md },
  stepTitle: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  stepIndex: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.pill, height: 28, justifyContent: "center", width: 28 },
  stepIndexText: { color: colors.surface, fontSize: 12, fontWeight: "700" },
  stepLabel: { color: colors.text, fontSize: 17, fontWeight: "700" },
  choice: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, gap: spacing.sm, minHeight: 56, padding: spacing.md },
  selected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  unavailable: { opacity: 0.65 },
  choiceHeading: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  choiceTitle: { color: colors.text, flexShrink: 1, fontWeight: "700" },
  status: { color: colors.primary, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  product: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  productCopy: { color: colors.text, flex: 1, lineHeight: 21, minWidth: 0 },
  available: { color: colors.success, fontSize: 12, fontWeight: "600" },
  unavailableText: { color: colors.muted, fontSize: 12 },
  notice: { alignItems: "flex-start", backgroundColor: colors.accentSoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  noticeCopy: { flex: 1, gap: spacing.sm },
  action: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 46, paddingHorizontal: spacing.lg },
  actionSecondary: { alignSelf: "stretch", backgroundColor: "transparent", borderColor: colors.primary, borderWidth: 1 },
  actionText: { color: colors.surface, fontWeight: "700" },
  actionTextSecondary: { color: colors.primary },
  disabled: { opacity: 0.5 },
  error: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  errorText: { color: colors.danger, flex: 1, lineHeight: 19 }
});
