import { Ionicons } from "@expo/vector-icons";
import { randomUUID } from "expo-crypto";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import type { CreateReturn, OrderDto, ParentOrderStatus, VendorOrderStatus } from "@amiyo/contracts";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { firebaseAuth } from "../auth/firebase";
import { OrderDeliverySummary } from "./OrderDeliverySummary";
import { OrderItemImage } from "./OrderItemImage";
import { CustomerReturnForm } from "./CustomerReturnForm";
import { CancelOrderConfirmation } from "./CancelOrderConfirmation";
import { cancellationState } from "./cancellation-policy";
import { cancelCustomerOrder, createCustomerReturn } from "../operations/operations.api";
import { getCustomerOrder } from "./orders.api";

const orderSteps: ParentOrderStatus[] = ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERED"];
const vendorSteps: VendorOrderStatus[] = ["PLACED", "ACCEPTED", "PROCESSING", "READY_TO_SHIP", "PICKED_UP", "IN_TRANSIT", "DELIVERED"];
const money = (minor: string) => `Tk ${(Number(minor) / 100).toLocaleString("en-BD")}`;
const statusLabel = (value: string) => value.replaceAll("_", " ");
function formatRemaining(ms: number) { const totalSeconds = Math.max(0, Math.ceil(ms / 1000)); const minutes = Math.floor(totalSeconds / 60); const seconds = totalSeconds % 60; return `${minutes}:${String(seconds).padStart(2, "0")}`; }
function progressIndex<T extends string>(steps: T[], status: string) { const index = steps.indexOf(status as T); return index < 0 ? 0 : index; }

export function CustomerOrderDetailScreen({ id }: { id: string }) {
  const user = useCurrentUser();
  return <ScopedOrderDetailScreen key={`${id}:${user?.uid ?? "signed-out"}`} id={id} />;
}

function ScopedOrderDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const cache = useQueryClient();
  const user = useCurrentUser();
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const actionIsCurrent = () => mounted.current && Boolean(user) && firebaseAuth?.currentUser?.uid === user?.uid;
  const { width } = useWindowDimensions();
  const compact = width < 620;
  const [confirmCancel, setConfirmCancel] = useState(false);
  useEffect(() => { setConfirmCancel(false); }, [id, user?.uid]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const handle = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(handle); }, []);
  const order = useQuery({ queryKey: ["orders", "customer", id, user?.uid], queryFn: () => getCustomerOrder(user!, id), enabled: Boolean(user), refetchInterval: 30_000 });
  const refresh = async () => { await cache.invalidateQueries({ queryKey: ["orders"] }); await order.refetch(); };
  const cancel = useMutation({ mutationFn: (reason: string) => { if (!actionIsCurrent()) throw new Error("Your account changed. Reopen this order."); if (!order.data || !cancellationState(order.data, Date.now()).cancellable) throw new Error("Cancellation is no longer available. Refresh the order."); return cancelCustomerOrder(user!, id, { reason, expectedVersion: order.data.version }, randomUUID()); }, onSuccess: async () => { if (!actionIsCurrent()) return; setConfirmCancel(false); await refresh(); } });
  const createReturn = useMutation({ mutationFn: (input: CreateReturn) => { if (!actionIsCurrent()) throw new Error("Your account changed. Reopen this order."); return createCustomerReturn(user!, input, randomUUID()); }, onSuccess: async () => { if (!actionIsCurrent()) return; await cache.invalidateQueries({ queryKey: ["returns"] }); if (actionIsCurrent()) router.push("/returns"); } });

  if (!user) return <OrderState title="Order details" copy="Sign in to view your order, tracking and invoice." action="Sign in" onPress={() => router.replace("/auth")} />;
  if (order.isLoading) return <OrderState loading title="Loading order" copy="Preparing your order timeline." />;
  if (!order.data) return <OrderState title="Order unavailable" copy={order.error?.message || "Order not found"} action="Back to orders" onPress={() => router.replace("/orders")} />;

  const data = order.data;
  const { remainingMs, statusAllowsCancel, cancellable } = cancellationState(data, now);
  const itemCount = data.vendorOrders.reduce((sum, vendorOrder) => sum + vendorOrder.items.reduce((count, item) => count + item.quantity, 0), 0);
  const cancellationCopy = data.status === "CANCELLED" ? "This order has been cancelled." : statusAllowsCancel ? remainingMs > 0 ? `Cancel available for ${formatRemaining(remainingMs)} more.` : "The 30 minute cancellation window has ended." : "Fulfillment has started, so cancellation is no longer available.";
  const stageIndex = ["CANCELLED", "REFUNDED", "RETURNED"].includes(data.status) ? -1 : progressIndex(orderSteps, data.status);

  return <Screen eyebrow="MY ORDER" title={data.orderNumber} description={`Placed ${new Date(data.createdAt).toLocaleString("en-BD")}`}>
    <View style={[styles.hero, compact && styles.heroCompact]}>
      <View style={styles.heroCopy}><View style={styles.statusRow}><StatusPill value={data.status} /><Text style={styles.version}>v{data.version}</Text></View><Text style={styles.total}>{money(data.total.amountMinor)}</Text><Text style={styles.heroText}>{itemCount} unit{itemCount === 1 ? "" : "s"} across {data.vendorOrders.length} seller package{data.vendorOrders.length === 1 ? "" : "s"}.</Text></View>
      <View style={[styles.heroActions, compact && styles.heroActionsCompact]}><ActionButton icon="navigate-outline" label="Track" onPress={() => router.push(`/order/${id}/tracking` as never)} /><ActionButton icon="receipt-outline" label="Invoice" onPress={() => router.push(`/order/${id}/invoice` as never)} primary />{cancellable ? <ActionButton danger busy={cancel.isPending} icon="close-circle-outline" label="Cancel" onPress={() => setConfirmCancel(true)} /> : null}</View>
    </View>
    {confirmCancel ? <CancelOrderConfirmation key={`${id}:${user.uid}`} busy={cancel.isPending} eligible={cancellable} onClose={() => setConfirmCancel(false)} onConfirm={(reason) => cancel.mutate(reason)} /> : null}
    {cancel.error || createReturn.error ? <Text style={styles.error}>{(cancel.error || createReturn.error)?.message}</Text> : null}
    <ModuleCard title="Order progress" meta={cancellationCopy}><Progress steps={orderSteps} activeIndex={stageIndex} finalStatus={data.status} /></ModuleCard>
    <View style={styles.metrics}><Metric icon="storefront-outline" label="Seller packages" value={String(data.vendorOrders.length)} /><Metric icon="cube-outline" label="Units" value={String(itemCount)} /><Metric icon="shield-checkmark-outline" label="Buyer protection" value="Active" /></View>
    <View style={styles.layout}>
      <View style={[styles.mainColumn, compact && styles.columnCompact]}>{data.vendorOrders.map((vendorOrder, index) => <SellerPackage compact={compact} index={index + 1} key={`${user.uid}:${vendorOrder.id}`} returnBusy={createReturn.isPending} onReturn={(input) => createReturn.mutateAsync(input)} vendorOrder={vendorOrder} />)}</View>
      <View style={[styles.sideColumn, compact && styles.columnCompact]}><OrderDeliverySummary order={data} /><ModuleCard title="Payment summary" meta="Secure Amiyo checkout"><Info label="Subtotal" value={money(data.subtotal.amountMinor)} /><Info label="Discount" value={`- ${money(data.discount.amountMinor)}`} /><Info label="Delivery" value={money(data.delivery.amountMinor)} /><Info label="Tax" value={money(data.tax.amountMinor)} /><View style={styles.totalLine}><Text style={styles.totalLabel}>Grand total</Text><Text style={styles.totalValue}>{money(data.total.amountMinor)}</Text></View></ModuleCard><ModuleCard title="Need help?" meta="Support is available for order issues."><SupportAction icon="chatbubble-ellipses-outline" label="Open support" onPress={() => router.push("/support" as never)} /><SupportAction icon="return-down-back-outline" label="My returns" onPress={() => router.push("/returns" as never)} /><SupportAction icon="refresh-outline" label="Refresh status" onPress={() => order.refetch()} /></ModuleCard></View>
    </View>
  </Screen>;
}

function SellerPackage({ compact, index, onReturn, returnBusy, vendorOrder }: { compact: boolean; index: number; onReturn(input: CreateReturn): Promise<unknown>; returnBusy: boolean; vendorOrder: OrderDto["vendorOrders"][number] }) {
  const activeIndex = progressIndex(vendorSteps, vendorOrder.status);
  return <ModuleCard title={vendorOrder.shopName || vendorOrder.vendorName || `Seller package ${index}`} meta={`${statusLabel(vendorOrder.status)} · ${vendorOrder.items.length} item type${vendorOrder.items.length === 1 ? "" : "s"}`}><View style={styles.shipment}><Text style={styles.muted}>Package {index}</Text>{vendorOrder.shipment ? <><Text style={styles.muted}>Shipment: {statusLabel(vendorOrder.shipment.status)}</Text>{vendorOrder.shipment.provider ? <Text style={styles.muted}>Carrier: {vendorOrder.shipment.provider}</Text> : null}{vendorOrder.shipment.trackingNumber ? <Text selectable style={styles.muted}>Tracking: {vendorOrder.shipment.trackingNumber}</Text> : null}</> : null}</View><Progress compact={compact} steps={vendorSteps} activeIndex={activeIndex} finalStatus={vendorOrder.status} /><View style={styles.items}>{vendorOrder.items.map((item) => <View key={item.id} style={[styles.item, compact && styles.itemCompact]}><OrderItemImage name={item.productName} uri={item.thumbnailUrl} /><View style={styles.itemCopy}><Text style={styles.itemName}>{item.productName}</Text><Text style={styles.muted}>{item.sku} · Qty {item.quantity} · {money(item.unitPrice.amountMinor)} each</Text></View><Text style={styles.itemPrice}>{money(item.lineTotal.amountMinor)}</Text></View>)}</View><View style={styles.packageFooter}><Info label="Package subtotal" value={money(vendorOrder.subtotal.amountMinor)} /><Info label="Delivery" value={money(vendorOrder.delivery.amountMinor)} /><Info label="Total" value={money(vendorOrder.total.amountMinor)} /></View>{vendorOrder.status === "DELIVERED" ? <CustomerReturnForm vendorOrder={vendorOrder} busy={returnBusy} onSubmit={onReturn} /> : null}</ModuleCard>;
}

function Progress({ activeIndex, compact = false, finalStatus, steps }: { activeIndex: number; compact?: boolean; finalStatus: string; steps: string[] }) {
  if (["CANCELLED", "REJECTED", "REFUNDED", "RETURNED"].includes(finalStatus)) return <View style={styles.terminal}><Ionicons color={colors.danger} name="alert-circle-outline" size={18} /><Text style={styles.terminalText}>{statusLabel(finalStatus)}</Text></View>;
  return <View style={[styles.progress, compact && styles.progressCompact]}>{steps.map((step, index) => { const active = index <= activeIndex; return <View key={step} style={[styles.step, compact && styles.stepCompact]}><View style={[styles.stepDot, active && styles.stepDotActive]}>{active ? <Ionicons color="#fff" name="checkmark" size={12} /> : null}</View><Text numberOfLines={compact ? 1 : 2} style={[styles.stepLabel, active && styles.stepLabelActive]}>{statusLabel(step)}</Text>{index < steps.length - 1 ? <View style={[styles.stepLine, active && styles.stepLineActive]} /> : null}</View>; })}</View>;
}

function ActionButton({ busy, danger, icon, label, onPress, primary }: { busy?: boolean; danger?: boolean; icon: string; label: string; onPress(): void; primary?: boolean }) { return <Pressable disabled={busy} onPress={onPress} style={[styles.action, primary && styles.actionPrimary, danger && styles.actionDanger, busy && styles.disabled]}>{busy ? <ActivityIndicator color={danger || primary ? "#fff" : colors.primary} /> : <Ionicons color={danger || primary ? "#fff" : colors.primary} name={icon as never} size={18} />}<Text style={[styles.actionText, (danger || primary) && styles.actionTextLight]}>{label}</Text></Pressable>; }
function Metric({ icon, label, value }: { icon: string; label: string; value: string }) { return <View style={styles.metric}><View style={styles.metricIcon}><Ionicons color={colors.primary} name={icon as never} size={19} /></View><View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View></View>; }
function Info({ label, value }: { label: string; value: string }) { return <View style={styles.info}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>; }
function StatusPill({ value }: { value: string }) { const danger = ["CANCELLED", "REFUNDED", "RETURNED"].includes(value); const good = ["DELIVERED", "CONFIRMED"].includes(value); return <Text style={[styles.status, good && styles.statusGood, danger && styles.statusDanger]}>{statusLabel(value)}</Text>; }
function SupportAction({ icon, label, onPress }: { icon: string; label: string; onPress(): void }) { return <Pressable onPress={onPress} style={styles.supportAction}><Ionicons color={colors.primary} name={icon as never} size={18} /><Text style={styles.supportLabel}>{label}</Text><Ionicons color={colors.muted} name="chevron-forward" size={16} /></Pressable>; }
function OrderState({ action, copy, loading, onPress, title }: { action?: string; copy: string; loading?: boolean; onPress?: () => void; title: string }) { return <Screen eyebrow="MY ORDER" title={title} description={copy}><View style={styles.empty}>{loading ? <ActivityIndicator color={colors.primary} size="large" /> : <Ionicons color={colors.primary} name="receipt-outline" size={50} />}{action && onPress ? <Pressable onPress={onPress} style={styles.primary}><Text style={styles.primaryText}>{action}</Text></Pressable> : null}</View></Screen>; }

const styles = StyleSheet.create({
  hero: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", gap: spacing.lg, justifyContent: "space-between", overflow: "hidden", padding: spacing.xl },
  heroCompact: { alignItems: "stretch", flexDirection: "column" },
  heroCopy: { flex: 1, minWidth: 0 },
  statusRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  status: { backgroundColor: "#fff7ed", borderRadius: radius.pill, color: colors.warning, fontSize: 10, fontWeight: "700", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 6 },
  statusGood: { backgroundColor: "#dcfce7", color: "#166534" },
  statusDanger: { backgroundColor: "#fee2e2", color: colors.danger },
  version: { color: "#94a3b8", fontSize: 10, fontWeight: "700" },
  total: { color: "#fff", fontSize: 34, fontWeight: "700", letterSpacing: -0.7, marginTop: spacing.sm },
  heroText: { color: "#cbd5e1", lineHeight: 20, marginTop: 5 },
  heroActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "flex-end" },
  heroActionsCompact: { justifyContent: "flex-start" },
  action: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, flexDirection: "row", gap: 7, minHeight: 44, paddingHorizontal: spacing.md },
  actionPrimary: { backgroundColor: colors.primary },
  actionDanger: { backgroundColor: colors.danger },
  actionText: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  actionTextLight: { color: "#fff" },
  progress: { flexDirection: "row", gap: 0 },
  progressCompact: { flexWrap: "wrap", rowGap: spacing.sm },
  step: { alignItems: "center", flex: 1, minWidth: 82, position: "relative" },
  stepCompact: { flexBasis: "31%" },
  stepDot: { alignItems: "center", backgroundColor: colors.border, borderRadius: radius.pill, height: 24, justifyContent: "center", width: 24, zIndex: 1 },
  stepDotActive: { backgroundColor: colors.primary },
  stepLine: { backgroundColor: colors.border, height: 2, left: "50%", position: "absolute", right: "-50%", top: 11 },
  stepLineActive: { backgroundColor: colors.primary },
  stepLabel: { color: colors.muted, fontSize: 9, fontWeight: "600", marginTop: 7, textAlign: "center" },
  stepLabelActive: { color: colors.text, fontWeight: "700" },
  terminal: { alignItems: "center", backgroundColor: "#fef2f2", borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  terminalText: { color: colors.danger, fontWeight: "700" },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metric: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flex: 1, flexDirection: "row", gap: spacing.sm, minWidth: 155, padding: spacing.md },
  metricIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 40, justifyContent: "center", width: 40 },
  metricValue: { color: colors.text, fontSize: 18, fontWeight: "700" },
  metricLabel: { color: colors.muted, fontSize: 10, fontWeight: "600", marginTop: 2 },
  layout: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.lg },
  columnCompact: { flex: 0, minWidth: 0, width: "100%" },
  shipment: { gap: spacing.xs, minWidth: 0 },
  mainColumn: { flex: 1.55, gap: spacing.md, minWidth: 310 },
  sideColumn: { flex: 1, gap: spacing.md, minWidth: 280 },
  items: { borderTopColor: colors.border, borderTopWidth: 1, marginTop: spacing.sm },
  item: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.md },
  itemCompact: { alignItems: "flex-start", flexDirection: "column" },
  itemCopy: { flex: 1, minWidth: 0 },
  itemName: { color: colors.text, fontWeight: "700" },
  itemPrice: { color: colors.accent, fontWeight: "700" },
  muted: { color: colors.muted, flexShrink: 1, fontSize: 11, lineHeight: 18, marginTop: 3 },
  packageFooter: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, paddingTop: spacing.md },
  info: { flex: 1, gap: 3, minWidth: 120 },
  infoLabel: { color: colors.muted, fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  infoValue: { color: colors.text, fontWeight: "600", lineHeight: 20 },
  totalLine: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "space-between", marginTop: spacing.sm, paddingTop: spacing.md },
  totalLabel: { color: colors.text, fontWeight: "700" },
  totalValue: { color: colors.success, fontSize: 20, fontWeight: "700" },
  returnBox: { backgroundColor: colors.primarySoft, borderRadius: radius.md, gap: spacing.sm, marginTop: spacing.md, padding: spacing.md },
  returnHeading: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  returnTitle: { color: colors.text, fontWeight: "700" },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 86, outlineStyle: "none", padding: spacing.md, textAlignVertical: "top" } as never,
  primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.md },
  primaryText: { color: "#fff", fontWeight: "700" },
  supportAction: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.sm, minHeight: 46 },
  supportLabel: { color: colors.text, flex: 1, fontWeight: "600" },
  error: { backgroundColor: "#fef2f2", borderRadius: radius.md, color: colors.danger, padding: spacing.md },
  disabled: { opacity: 0.55 },
  empty: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderStyle: "dashed", borderWidth: 1, gap: spacing.lg, padding: 42 }
});
