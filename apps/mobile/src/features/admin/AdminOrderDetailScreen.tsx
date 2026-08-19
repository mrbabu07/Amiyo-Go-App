import { Ionicons } from "@expo/vector-icons";
import { randomUUID } from "expo-crypto";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import type { AdminOrderDetail } from "@amiyo/contracts";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { cancelCustomerOrder } from "../operations/operations.api";
import { transitionVendorOrder } from "../orders/orders.api";
import { getAdminOrderDetail } from "./admin.api";
import { AdminOrderInterventions } from "./AdminOrderInterventions";
import { AdminOrderRefund } from "./AdminOrderRefund";
import { AdminOrderReturnWindow } from "./AdminOrderReturnWindow";

const parentSteps = ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERED"];
const vendorSteps = ["PLACED", "ACCEPTED", "PROCESSING", "READY_TO_SHIP", "PICKED_UP", "IN_TRANSIT", "DELIVERED"];
const nextStatuses: Record<string, string[]> = { PLACED: ["ACCEPTED", "REJECTED", "CANCELLED"], ACCEPTED: ["PROCESSING", "CANCELLED"], PROCESSING: ["READY_TO_SHIP", "CANCELLED"], READY_TO_SHIP: ["PICKED_UP"], PICKED_UP: ["IN_TRANSIT"], IN_TRANSIT: ["DELIVERED"] };
const money = (minor: string) => `Tk ${(Number(minor) / 100).toLocaleString("en-BD")}`;
const statusLabel = (value: string) => value.replaceAll("_", " ");
const statusIndex = (steps: string[], status: string) => Math.max(0, steps.indexOf(status));

export function AdminOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = firebaseAuth?.currentUser ?? null;
  const router = useRouter();
  const cache = useQueryClient();
  const { width } = useWindowDimensions();
  const compact = width < 680;
  const narrow = width < 430;
  const [cancelReason, setCancelReason] = useState("");
  const order = useQuery({ queryKey: ["admin", "order", id], queryFn: () => getAdminOrderDetail(user!, id), enabled: Boolean(user && id), refetchInterval: 15_000 });
  const transition = useMutation({
    mutationFn: ({ vendorOrderId, status, version }: { vendorOrderId: string; status: string; version: number }) => transitionVendorOrder(user!, vendorOrderId, { status: status as never, expectedVersion: version, reason: `Status updated to ${status} by marketplace administrator` }, randomUUID()),
    onSuccess: async () => { await Promise.all([cache.invalidateQueries({ queryKey: ["admin", "order", id] }), cache.invalidateQueries({ queryKey: ["admin", "commerce"] })]); }
  });
  const cancelOrder = useMutation({ mutationFn: () => cancelCustomerOrder(user!, id, { expectedVersion: order.data!.version, reason: cancelReason.trim() }, randomUUID()), onSuccess: async () => { setCancelReason(""); await Promise.all([cache.invalidateQueries({ queryKey: ["admin", "order", id] }), cache.invalidateQueries({ queryKey: ["admin", "commerce"] }), cache.invalidateQueries({ queryKey: ["notifications"] })]); } });

  if (order.isLoading) return <Screen title="Order detail"><ActivityIndicator color={colors.primary} /></Screen>;
  if (!order.data) return <Screen title="Order detail"><Text style={styles.error}>{order.error?.message ?? "Order not found"}</Text></Screen>;

  const data = order.data;
  const address = data.deliveryAddress;
  const itemCount = data.vendorOrders.reduce((sum, vendorOrder) => sum + vendorOrder.items.reduce((count, item) => count + item.quantity, 0), 0);
  const fulfilled = data.vendorOrders.filter((item) => item.status === "DELIVERED").length;
  const risky = ["PENDING_PAYMENT", "CANCELLED", "REFUNDED"].includes(data.status) || data.payment?.status === "HELD_FOR_REVIEW";

  return <Screen eyebrow="ORDER OPERATIONS" title={data.orderNumber} description={`Placed ${new Date(data.placedAt ?? data.createdAt).toLocaleString("en-BD")}`}>
    <View style={[styles.commandBar, compact && styles.commandBarCompact]}>
      <View style={styles.commandCopy}><View style={styles.statusLine}><Status value={data.status} /><Text style={styles.version}>Order v{data.version}</Text>{risky ? <Text style={styles.risk}>NEEDS ATTENTION</Text> : null}</View><Text style={styles.commandTotal}>{money(data.total.amountMinor)}</Text><Text style={styles.commandMeta}>{fulfilled}/{data.vendorOrders.length} seller fulfillments delivered - {itemCount} unit{itemCount === 1 ? "" : "s"} ordered</Text></View>
      <View style={[styles.commandActions, compact && styles.commandActionsCompact]}><Button icon="refresh" label="Refresh" onPress={() => order.refetch()} /><Button primary icon="print-outline" label="Print invoice" onPress={() => router.push(`/admin/orders/${data.id}/invoice` as never)} /></View>
    </View>
    {transition.error || cancelOrder.error ? <Text style={styles.error}>{(transition.error || cancelOrder.error)?.message}</Text> : null}
    <ModuleCard title="Operational progress" meta="Live order state across payment, packing and delivery."><Progress compact={compact} steps={parentSteps} activeIndex={statusIndex(parentSteps, data.status)} finalStatus={data.status} /></ModuleCard>
    <View style={styles.metrics}><Metric icon="cash-outline" label="Order total" value={money(data.total.amountMinor)} /><Metric icon="card-outline" label="Payment" value={data.payment?.status ?? "UNPAID"} /><Metric icon="storefront-outline" label="Seller orders" value={String(data.vendorOrders.length)} /><Metric icon="cube-outline" label="Units" value={String(itemCount)} /></View>
    <View style={styles.twoColumn}>
      <View style={[styles.column, compact && styles.fullColumn]}><ModuleCard title="Customer & delivery" meta={data.customer.email ?? data.customer.phone ?? "Registered customer"}><Info label="Customer" value={data.customer.displayName || "Customer"} /><Info label="Phone" value={address?.phone ?? data.customer.phone ?? "-"} /><Info label="Delivery address" value={address ? [address.recipientName, address.line1, address.line2, address.unionName, address.upazila, address.district, address.division, address.postalCode].filter(Boolean).join(", ") : "Delivery address unavailable"} /></ModuleCard></View>
      <View style={[styles.column, compact && styles.fullColumn]}><ModuleCard title="Payment & invoice" meta={data.invoice?.number ?? "Invoice pending"}><Info label="Provider" value={data.payment?.provider ?? "-"} /><Info label="Method" value={data.payment?.method ?? "-"} /><Info label="Transaction" value={data.payment?.transactionId ?? "-"} /><Info label="Refunded" value={money(data.payment?.refunded.amountMinor ?? "0")} /><TotalLine label="Payable total" value={money(data.total.amountMinor)} /></ModuleCard></View>
    </View>
    <View style={[styles.sectionHeading, compact && styles.sectionHeadingCompact]}><View><Text style={styles.kicker}>SELLER FULFILLMENT</Text><Text style={styles.sectionTitle}>Package control</Text></View><Text style={styles.muted}>{data.vendorOrders.length} shipment group(s)</Text></View>
    {data.vendorOrders.map((vendorOrder, index) => <VendorOrderCard compact={compact} key={vendorOrder.id} index={index + 1} narrow={narrow} pending={transition.isPending} vendorOrder={vendorOrder} onTransition={(status) => transition.mutate({ vendorOrderId: vendorOrder.id, status, version: vendorOrder.version })} />)}
    <View style={styles.twoColumn}>
      <View style={[styles.column, compact && styles.fullColumn]}><ModuleCard title="Order totals" meta="Customer-facing invoice amounts"><Info label="Subtotal" value={money(data.subtotal.amountMinor)} /><Info label="Discount" value={`- ${money(data.discount.amountMinor)}`} /><Info label="Delivery" value={money(data.delivery.amountMinor)} /><Info label="Tax" value={money(data.tax.amountMinor)} /><TotalLine label="Grand total" value={money(data.total.amountMinor)} /></ModuleCard></View>
      <View style={[styles.column, compact && styles.fullColumn]}><ModuleCard title="Audit timeline" meta={`${data.events.length} recorded event(s)`}>{data.events.length ? data.events.map((event, index) => <AuditEvent event={event} key={event.id} last={index === data.events.length - 1} />) : <Text style={styles.muted}>No status events recorded yet.</Text>}</ModuleCard></View>
    </View>
    {["PENDING_PAYMENT", "CONFIRMED", "PROCESSING"].includes(data.status) ? <ModuleCard title="Administrative cancellation" meta="Cancels seller fulfillments, releases stock and starts eligible refund handling."><TextInput multiline onChangeText={setCancelReason} placeholder="Operational reason for force cancellation" placeholderTextColor={colors.muted} style={styles.cancelInput} value={cancelReason} /><Pressable disabled={cancelOrder.isPending || cancelReason.trim().length < 3} onPress={() => cancelOrder.mutate()} style={[styles.cancelButton, compact && styles.cancelButtonFull, (cancelOrder.isPending || cancelReason.trim().length < 3) && styles.disabled]}><Ionicons color="#fff" name="close-circle-outline" size={18} /><Text style={styles.primaryText}>{cancelOrder.isPending ? "Cancelling..." : "Force cancel order"}</Text></Pressable></ModuleCard> : null}
    <AdminOrderInterventions key={`${data.id}:${data.version}`} order={data} />
    <AdminOrderReturnWindow key={`return:${data.id}:${data.version}`} order={data} />
    <AdminOrderRefund key={`refund:${data.id}:${data.version}:${data.payment?.refunded.amountMinor ?? "0"}`} order={data} />
  </Screen>;
}

function VendorOrderCard({ compact, index, narrow, onTransition, pending, vendorOrder }: { compact: boolean; index: number; narrow: boolean; onTransition(status: string): void; pending: boolean; vendorOrder: AdminOrderDetail["vendorOrders"][number] }) {
  return <ModuleCard title={`${index}. ${vendorOrder.shopName}`} meta={`${vendorOrder.vendorName} - ${statusLabel(vendorOrder.status)} - v${vendorOrder.version}`}><Progress compact={compact} steps={vendorSteps} activeIndex={statusIndex(vendorSteps, vendorOrder.status)} finalStatus={vendorOrder.status} /><View style={styles.amountGrid}><Info label="Subtotal" value={money(vendorOrder.subtotal.amountMinor)} /><Info label="Discount" value={money(vendorOrder.discount.amountMinor)} /><Info label="Delivery" value={money(vendorOrder.delivery.amountMinor)} /><Info label="Commission" value={money(vendorOrder.commission.amountMinor)} /><Info label="Seller total" value={money(vendorOrder.total.amountMinor)} /></View><View style={styles.items}>{vendorOrder.items.map((item) => <View key={item.id} style={[styles.item, narrow && styles.itemNarrow]}><View style={styles.itemIcon}><Ionicons color={colors.primary} name="cube-outline" size={18} /></View><View style={styles.flex}><Text style={styles.itemTitle}>{item.productName}</Text><Text style={styles.muted}>{item.sku} - Qty {item.quantity} x {money(item.unitPrice.amountMinor)}</Text></View><Text style={styles.itemPrice}>{money(item.lineTotal.amountMinor)}</Text></View>)}</View><View style={styles.shipment}><Ionicons color={colors.primary} name="car-outline" size={19} /><View style={styles.flex}><Text style={styles.itemTitle}>{vendorOrder.shipment?.status ?? "Shipment not created"}</Text><Text style={styles.muted}>{vendorOrder.shipment?.trackingNumber ?? vendorOrder.shipment?.provider ?? "Dispatch begins at ready-to-ship"}</Text></View></View>{nextStatuses[vendorOrder.status]?.length ? <View style={styles.actions}>{nextStatuses[vendorOrder.status].map((next) => <Pressable disabled={pending} key={next} onPress={() => onTransition(next)} style={[styles.actionChip, ["REJECTED", "CANCELLED"].includes(next) && styles.actionDanger, pending && styles.disabled]}><Text style={[styles.actionText, ["REJECTED", "CANCELLED"].includes(next) && styles.actionDangerText]}>{statusLabel(next)}</Text></Pressable>)}</View> : <Text style={styles.complete}>No further fulfillment action is available.</Text>}</ModuleCard>;
}

function Progress({ activeIndex, compact, finalStatus, steps }: { activeIndex: number; compact: boolean; finalStatus: string; steps: string[] }) {
  if (["CANCELLED", "REJECTED", "REFUNDED", "RETURNED"].includes(finalStatus)) return <View style={styles.terminal}><Ionicons color={colors.danger} name="alert-circle-outline" size={18} /><Text style={styles.terminalText}>{statusLabel(finalStatus)}</Text></View>;
  return <View style={[styles.progress, compact && styles.progressCompact]}>{steps.map((step, index) => { const active = index <= activeIndex; return <View key={step} style={[styles.step, compact && styles.stepCompact]}><View style={[styles.stepDot, active && styles.stepDotActive]}>{active ? <Ionicons color="#fff" name="checkmark" size={12} /> : null}</View><Text numberOfLines={2} style={[styles.stepLabel, active && styles.stepLabelActive]}>{statusLabel(step)}</Text>{index < steps.length - 1 ? <View style={[styles.stepLine, active && styles.stepLineActive]} /> : null}</View>; })}</View>;
}

function Button({ icon, label, onPress, primary }: { icon: string; label: string; onPress(): void; primary?: boolean }) { return <Pressable onPress={onPress} style={[styles.button, primary && styles.buttonPrimary]}><Ionicons color={primary ? "#fff" : colors.primary} name={icon as never} size={17} /><Text style={[styles.buttonText, primary && styles.primaryText]}>{label}</Text></Pressable>; }
function Metric({ icon, label, value }: { icon: string; label: string; value: string }) { return <View style={styles.metric}><View style={styles.metricIcon}><Ionicons color={colors.primary} name={icon as never} size={19} /></View><View style={styles.flex}><Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{value}</Text><Text style={styles.muted}>{label}</Text></View></View>; }
function Info({ label, value }: { label: string; value: string }) { return <View style={styles.info}><Text style={styles.infoLabel}>{label}</Text><Text selectable style={styles.infoValue}>{value}</Text></View>; }
function TotalLine({ label, value }: { label: string; value: string }) { return <View style={styles.totalLine}><Text style={styles.totalLabel}>{label}</Text><Text style={styles.totalValue}>{value}</Text></View>; }
function Status({ value }: { value: string }) { const good = ["CONFIRMED", "FULFILLED", "DELIVERED"].includes(value); const danger = ["CANCELLED", "REFUNDED", "RETURNED"].includes(value); return <Text style={[styles.status, good && styles.statusGood, danger && styles.statusDanger]}>{statusLabel(value)}</Text>; }
function AuditEvent({ event, last }: { event: AdminOrderDetail["events"][number]; last: boolean }) { return <View style={styles.event}><View style={styles.rail}><View style={[styles.eventDot, last && styles.eventDotActive]} />{!last ? <View style={styles.eventLine} /> : null}</View><View style={styles.flex}><Text style={styles.itemTitle}>{statusLabel(event.toStatus)}</Text><Text style={styles.muted}>{new Date(event.createdAt).toLocaleString("en-BD")} - {event.actorType}</Text>{event.reason ? <Text style={styles.reason}>{event.reason}</Text> : null}</View></View>; }

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  commandBar: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", gap: spacing.lg, justifyContent: "space-between", padding: spacing.xl },
  commandBarCompact: { alignItems: "stretch", flexDirection: "column" },
  commandCopy: { flex: 1, minWidth: 0 },
  statusLine: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  status: { alignSelf: "flex-start", backgroundColor: "#fff7ed", borderRadius: radius.pill, color: colors.warning, fontSize: 10, fontWeight: "700", overflow: "hidden", paddingHorizontal: 11, paddingVertical: 7 },
  statusGood: { backgroundColor: "#ecfdf5", color: colors.success },
  statusDanger: { backgroundColor: "#fee2e2", color: colors.danger },
  version: { color: "#94a3b8", fontSize: 10, fontWeight: "700" },
  risk: { backgroundColor: "#7f1d1d", borderRadius: radius.pill, color: "#fecaca", fontSize: 9, fontWeight: "700", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 5 },
  commandTotal: { color: "#fff", fontSize: 34, fontWeight: "700", letterSpacing: -0.7, marginTop: spacing.sm },
  commandMeta: { color: "#cbd5e1", lineHeight: 20, marginTop: 5 },
  commandActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "flex-end" },
  commandActionsCompact: { justifyContent: "flex-start" },
  button: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, flexDirection: "row", gap: 7, minHeight: 44, paddingHorizontal: spacing.md },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonText: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  primaryText: { color: "#fff", fontWeight: "700" },
  error: { backgroundColor: "#fef2f2", borderRadius: radius.md, color: colors.danger, padding: spacing.md },
  progress: { flexDirection: "row" },
  progressCompact: { flexWrap: "wrap", rowGap: spacing.sm },
  step: { alignItems: "center", flex: 1, minWidth: 84, position: "relative" },
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
  metric: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flex: 1, flexDirection: "row", gap: spacing.sm, minWidth: 175, padding: spacing.md },
  metricIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 40, justifyContent: "center", width: 40 },
  metricValue: { color: colors.text, fontSize: 18, fontWeight: "700" },
  muted: { color: colors.muted, flexShrink: 1, fontSize: 11, lineHeight: 18, marginTop: 3 },
  twoColumn: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  column: { flex: 1, minWidth: 300 },
  fullColumn: { flexBasis: "100%", minWidth: 0, width: "100%" },
  info: { flexBasis: 140, flexGrow: 1, gap: 3, minWidth: 0 },
  infoLabel: { color: colors.muted, fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  infoValue: { color: colors.text, flexShrink: 1, lineHeight: 20 },
  totalLine: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "space-between", paddingTop: spacing.md },
  totalLabel: { color: colors.text, flexShrink: 1, fontWeight: "700" },
  totalValue: { color: colors.success, flexShrink: 1, fontSize: 20, fontWeight: "700" },
  sectionHeading: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between" },
  sectionHeadingCompact: { alignItems: "flex-start", flexDirection: "column", gap: 3 },
  kicker: { color: colors.primary, fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  sectionTitle: { color: colors.text, fontSize: 21, fontWeight: "700" },
  amountGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  items: { borderTopColor: colors.border, borderTopWidth: 1, marginTop: spacing.md },
  item: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.md },
  itemNarrow: { alignItems: "flex-start", flexDirection: "column" },
  itemIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 38, justifyContent: "center", width: 38 },
  itemTitle: { color: colors.text, flexShrink: 1, fontWeight: "600" },
  itemPrice: { color: colors.text, flexShrink: 1, fontWeight: "700" },
  shipment: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, padding: spacing.sm },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.md },
  actionChip: { backgroundColor: colors.primarySoft, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8 },
  actionText: { color: colors.primary, fontSize: 10, fontWeight: "700" },
  actionDanger: { backgroundColor: "#fef2f2" },
  actionDangerText: { color: colors.danger },
  complete: { color: colors.success, fontSize: 11, fontWeight: "600", marginTop: spacing.sm },
  event: { flexDirection: "row", gap: spacing.sm, minHeight: 64 },
  rail: { alignItems: "center", width: 18 },
  eventDot: { backgroundColor: colors.border, borderRadius: radius.pill, height: 12, marginTop: 4, width: 12 },
  eventDotActive: { backgroundColor: colors.primary },
  eventLine: { backgroundColor: colors.border, flex: 1, width: 2 },
  reason: { color: colors.text, flexShrink: 1, fontSize: 11, marginTop: 4 },
  cancelInput: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 80, outlineStyle: "none", padding: spacing.md, textAlignVertical: "top" } as never,
  cancelButton: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.danger, borderRadius: radius.md, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.lg },
  cancelButtonFull: { alignSelf: "stretch" },
  disabled: { opacity: 0.55 }
});
