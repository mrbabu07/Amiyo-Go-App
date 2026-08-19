import type { VendorOrderDetail, VendorOrderStatus } from "@amiyo/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { getVendorOrder, transitionVendorOrder } from "./orders.api";

const actions: Partial<Record<VendorOrderStatus, Array<{ status: VendorOrderStatus; label: string; danger?: boolean }>>> = {
  PLACED: [{ status: "ACCEPTED", label: "Accept order" }, { status: "REJECTED", label: "Reject", danger: true }],
  ACCEPTED: [{ status: "PROCESSING", label: "Start processing" }],
  PROCESSING: [{ status: "READY_TO_SHIP", label: "Ready for pickup" }]
};
const money = (minor: string, currency = "BDT") => `${currency === "BDT" ? "Tk" : currency} ${(Number(minor) / 100).toLocaleString("en-BD", { minimumFractionDigits: 2 })}`;
const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

export function VendorOrderDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = firebaseAuth?.currentUser ?? null;
  const { width } = useWindowDimensions();
  const compact = width < 640;
  const [busy, setBusy] = useState<VendorOrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const order = useQuery({ queryKey: ["orders", "vendor", id], queryFn: () => getVendorOrder(user!, id), enabled: Boolean(user) });

  async function transition(status: VendorOrderStatus) {
    if (!user || !order.data) return;
    setBusy(status);
    setError(null);
    try {
      const updated = await transitionVendorOrder(user, id, { status, expectedVersion: order.data.version }, Crypto.randomUUID());
      queryClient.setQueryData(["orders", "vendor", id], updated);
      await queryClient.invalidateQueries({ queryKey: ["orders", "vendor"] });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Order update failed");
    } finally {
      setBusy(null);
    }
  }

  if (order.isLoading) return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  if (!order.data) return <View style={styles.center}><Text style={styles.error}>{order.error instanceof Error ? order.error.message : "Order not found"}</Text><Pressable onPress={() => router.back()}><Text style={styles.link}>Go back</Text></Pressable></View>;

  const item = order.data;
  const units = item.items.reduce((sum, line) => sum + line.quantity, 0);
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}>
    <Pressable onPress={() => router.back()} style={styles.back}><Ionicons color={colors.primary} name="arrow-back" size={17} /><Text style={styles.link}>Vendor orders</Text></Pressable>
    <View style={[styles.hero, compact && styles.heroCompact]}>
      <View style={styles.flex}><View style={styles.statusRow}><Text style={styles.status}>{label(item.status)}</Text><Text style={styles.version}>v{item.version}</Text></View><Text accessibilityRole="header" style={styles.title}>{item.orderNumber}</Text><Text style={styles.heroText}>{item.shopName} package with {units} unit{units === 1 ? "" : "s"} ready for seller fulfillment.</Text></View>
      <View style={[styles.heroActions, compact && styles.heroActionsCompact]}><HeroButton icon="document-text-outline" label="Packing slip" onPress={() => router.push(`/vendor/order/${item.id}/documents` as never)} primary /><HeroButton icon="refresh" label="Refresh" onPress={() => order.refetch()} /></View>
    </View>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <View style={styles.metrics}><Metric icon="cube-outline" label="Units" value={String(units)} /><Metric icon="cash-outline" label="Package total" value={money(item.total.amountMinor, item.total.currency)} /><Metric icon="card-outline" label="Payment" value={item.payment ? `${item.payment.method} - ${item.payment.status}` : "Pending"} /></View>
    <View style={styles.columns}>
      <View style={[styles.column, compact && styles.full]}><Panel title="Customer & delivery" meta="Use this for delivery handoff only."><Detail label="Customer" value={item.customer.displayName} /><Detail label="Phone" value={item.deliveryAddress?.phone ?? item.customer.phone ?? "-"} /><Detail label="Address" value={item.deliveryAddress ? address(item.deliveryAddress) : "Delivery address unavailable"} /></Panel></View>
      <View style={[styles.column, compact && styles.full]}><Panel title="Payment collection" meta={item.payment?.transactionId ?? "No transaction reference yet"}><Detail label="Method" value={item.payment?.method ?? "-"} /><Detail label="Status" value={item.payment?.status ?? "-"} /><Detail label="Collect on delivery" value={item.payment?.method === "COD" ? money(item.total.amountMinor, item.total.currency) : "Prepaid / no COD collection"} strong /></Panel></View>
    </View>
    <Panel title="Products to fulfill" meta={`${item.items.length} product line${item.items.length === 1 ? "" : "s"} from this store.`}>
      <View style={styles.tableHead}><Text style={[styles.head, styles.product]}>Product</Text><Text style={styles.head}>Qty</Text><Text style={styles.head}>Unit</Text><Text style={[styles.head, styles.right]}>Total</Text></View>
      {item.items.map((line) => <View key={line.id} style={[styles.line, compact && styles.lineCompact]}><View style={styles.product}><Text style={styles.itemName}>{line.productName}</Text><Text style={styles.muted}>{line.sku}{line.attributes ? ` - ${Object.values(line.attributes).filter(Boolean).join(", ")}` : ""}</Text></View><Text style={styles.cell}>{line.quantity}</Text><Text style={styles.cell}>{money(line.unitPrice.amountMinor, line.unitPrice.currency)}</Text><Text style={[styles.cell, styles.right]}>{money(line.lineTotal.amountMinor, line.lineTotal.currency)}</Text></View>)}
    </Panel>
    <View style={styles.columns}>
      <View style={[styles.column, compact && styles.full]}><Panel title="Package totals"><Detail label="Subtotal" value={money(item.subtotal.amountMinor, item.subtotal.currency)} /><Detail label="Discount" value={`- ${money(item.discount.amountMinor, item.discount.currency)}`} /><Detail label="Delivery" value={money(item.delivery.amountMinor, item.delivery.currency)} /><Detail label="Seller package total" value={money(item.total.amountMinor, item.total.currency)} strong /></Panel></View>
      <View style={[styles.column, compact && styles.full]}><Panel title="Shipment status" meta={item.dispatchStatus ?? "Dispatch not requested"}><Detail label="Provider" value={item.shipment?.provider ?? "Amiyo delivery"} /><Detail label="Tracking" value={item.shipment?.trackingNumber ?? "At pickup"} /><Detail label="Shipment" value={item.shipment?.status ? label(item.shipment.status) : "Not created"} /></Panel></View>
    </View>
    {actions[item.status]?.length ? <View style={styles.actions}>{actions[item.status]!.map((action) => <Pressable disabled={Boolean(busy)} key={action.status} onPress={() => transition(action.status)} style={[styles.primary, action.danger && styles.danger, busy && styles.disabled]}>{busy === action.status ? <ActivityIndicator color="#fff" /> : <><Ionicons name={action.status === "READY_TO_SHIP" ? "cube-outline" : "checkmark-circle-outline"} size={19} color="#fff" /><Text style={styles.primaryText}>{action.label}</Text></>}</Pressable>)}</View> : <Text style={styles.notice}>No seller action is required at this stage.</Text>}
  </ScrollView></SafeAreaView>;
}

function HeroButton({ icon, label: text, onPress, primary }: { icon: string; label: string; onPress(): void; primary?: boolean }) { return <Pressable onPress={onPress} style={[styles.heroButton, primary && styles.heroButtonPrimary]}><Ionicons color={primary ? "#fff" : colors.primary} name={icon as never} size={17} /><Text style={[styles.heroButtonText, primary && styles.light]}>{text}</Text></Pressable>; }
function Panel({ children, meta, title }: { children: ReactNode; meta?: string; title: string }) { return <View style={styles.card}><View><Text style={styles.sectionTitle}>{title}</Text>{meta ? <Text style={styles.muted}>{meta}</Text> : null}</View>{children}</View>; }
function Detail({ label: title, strong, value }: { label: string; strong?: boolean; value: string }) { return <View style={styles.detail}><Text style={styles.detailLabel}>{title}</Text><Text selectable style={[styles.value, strong && styles.strong]}>{value}</Text></View>; }
function Metric({ icon, label: title, value }: { icon: string; label: string; value: string }) { return <View style={styles.metric}><View style={styles.metricIcon}><Ionicons color={colors.primary} name={icon as never} size={19} /></View><View style={styles.flex}><Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{value}</Text><Text style={styles.muted}>{title}</Text></View></View>; }
function address(value: NonNullable<VendorOrderDetail["deliveryAddress"]>) { return [value.recipientName, value.line1, value.line2, value.unionName, value.upazila, value.district, value.division, value.postalCode].filter(Boolean).join(", "); }

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  page: { alignSelf: "center", gap: spacing.md, maxWidth: 980, padding: spacing.lg, width: "100%" },
  flex: { flex: 1, minWidth: 0 },
  back: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 6 },
  link: { color: colors.primary, fontWeight: "700" },
  hero: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", gap: spacing.lg, justifyContent: "space-between", padding: spacing.xl },
  heroCompact: { alignItems: "stretch", flexDirection: "column" },
  statusRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  status: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, color: colors.primary, fontSize: 10, fontWeight: "700", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 6 },
  version: { color: "#94a3b8", fontSize: 10, fontWeight: "700" },
  title: { color: "#fff", fontSize: 31, fontWeight: "700", letterSpacing: -0.7, marginTop: spacing.sm },
  heroText: { color: "#cbd5e1", lineHeight: 20, marginTop: 5 },
  heroActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "flex-end" },
  heroActionsCompact: { justifyContent: "flex-start" },
  heroButton: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, flexDirection: "row", gap: 7, minHeight: 44, paddingHorizontal: spacing.md },
  heroButtonPrimary: { backgroundColor: colors.primary },
  heroButtonText: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  light: { color: "#fff" },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metric: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flex: 1, flexDirection: "row", gap: spacing.sm, minWidth: 175, padding: spacing.md },
  metricIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 40, justifyContent: "center", width: 40 },
  metricValue: { color: colors.text, fontSize: 18, fontWeight: "700" },
  columns: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  column: { flex: 1, minWidth: 300 },
  full: { flexBasis: "100%", minWidth: 0, width: "100%" },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  muted: { color: colors.muted, flexShrink: 1, fontSize: 11, lineHeight: 18, marginTop: 3 },
  detail: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" },
  detailLabel: { color: colors.muted, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  value: { color: colors.text, flexShrink: 1, fontWeight: "600", lineHeight: 20, textAlign: "right" },
  strong: { color: colors.accent, fontSize: 17, fontWeight: "700" },
  tableHead: { backgroundColor: colors.navy, borderRadius: radius.md, flexDirection: "row", paddingHorizontal: spacing.sm, paddingVertical: 10 },
  head: { color: "#fff", fontSize: 9, fontWeight: "700", width: 88 },
  product: { flex: 1, minWidth: 170 },
  right: { textAlign: "right" },
  line: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.md },
  lineCompact: { alignItems: "flex-start", flexDirection: "column" },
  itemName: { color: colors.text, fontWeight: "700" },
  cell: { color: colors.text, fontSize: 10, width: 88 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.lg },
  danger: { backgroundColor: colors.danger },
  disabled: { opacity: 0.5 },
  primaryText: { color: "#fff", fontWeight: "700" },
  notice: { backgroundColor: colors.primarySoft, borderRadius: radius.md, color: colors.primaryDark, padding: spacing.md },
  error: { backgroundColor: "#fef2f2", borderRadius: radius.md, color: colors.danger, padding: spacing.md },
  center: { alignItems: "center", backgroundColor: colors.background, flex: 1, gap: spacing.md, justifyContent: "center", padding: spacing.xl }
});
