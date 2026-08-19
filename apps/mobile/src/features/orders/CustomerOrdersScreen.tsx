import type { CustomerOrderSummary } from "@amiyo/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { getCustomerOrders } from "./orders.api";

type Filter = "ALL" | "ACTIVE" | "DELIVERED" | "CANCELLED";
const filters: Array<{ label: string; value: Filter }> = [
  { label: "All", value: "ALL" },
  { label: "In progress", value: "ACTIVE" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" }
];

const fallbackImage = "https://placehold.co/240x240/eaf4f8/1e7098?text=Amiyo";
const money = (minor: string) => `Tk ${(Number(minor) / 100).toLocaleString("en-BD")}`;
const statusLabel = (status: string) => status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

function matchesFilter(order: CustomerOrderSummary, filter: Filter) {
  if (filter === "ALL") return true;
  if (filter === "DELIVERED") return order.status === "DELIVERED";
  if (filter === "CANCELLED") return order.status === "CANCELLED";
  return !["DELIVERED", "CANCELLED", "REFUNDED"].includes(order.status);
}

export function CustomerOrdersScreen() {
  const router = useRouter();
  const user = firebaseAuth?.currentUser ?? null;
  const { width } = useWindowDimensions();
  const compact = width < 520;
  const [filter, setFilter] = useState<Filter>("ALL");
  const orders = useQuery({ queryKey: ["orders", "customer"], queryFn: () => getCustomerOrders(user!), enabled: Boolean(user), refetchInterval: 30_000 });
  const visibleOrders = useMemo(() => orders.data?.filter((order) => matchesFilter(order, filter)) ?? [], [filter, orders.data]);
  const activeCount = orders.data?.filter((order) => matchesFilter(order, "ACTIVE")).length ?? 0;
  const deliveredCount = orders.data?.filter((order) => order.status === "DELIVERED").length ?? 0;

  if (!user) return <OrderState title="Your orders are private" copy="Sign in to view purchases, delivery updates and invoices." action="Sign in" onPress={() => router.replace("/auth")} />;
  if (orders.isLoading) return <OrderState loading title="Loading your orders" copy="Fetching your latest purchase history." />;
  if (orders.error) return <OrderState title="Could not load orders" copy={orders.error instanceof Error ? orders.error.message : "Please try again."} action="Try again" onPress={() => orders.refetch()} />;

  return <Screen eyebrow="MY ACCOUNT" title="My orders" description="Track deliveries, invoices and return support in one place.">
    <View style={[styles.hero, compact && styles.heroCompact]}>
      <View style={styles.heroCopy}><Text style={styles.heroTitle}>{orders.data?.length ?? 0} orders</Text><Text style={styles.heroText}>{activeCount} active deliveries - {deliveredCount} completed purchases</Text></View>
      <View style={styles.heroIcon}><Ionicons color="#fff" name="bag-check-outline" size={30} /></View>
    </View>
    <View accessibilityRole="tablist" style={styles.filters}>{filters.map((item) => <Pressable accessibilityRole="tab" accessibilityState={{ selected: filter === item.value }} key={item.value} onPress={() => setFilter(item.value)} style={[styles.filter, filter === item.value && styles.filterActive]}><Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>{item.label}</Text></Pressable>)}</View>
    {visibleOrders.length ? <View style={styles.list}>{visibleOrders.map((order) => <OrderCard compact={compact} key={order.id} order={order} onInvoice={() => router.push(`/order/${order.id}/invoice` as never)} onOpen={() => router.push(`/order/${order.id}` as never)} onTrack={() => router.push(`/order/${order.id}/tracking` as never)} />)}</View> : <View style={styles.empty}><Ionicons color={colors.primary} name="receipt-outline" size={48} /><Text accessibilityRole="header" style={styles.emptyTitle}>{filter === "ALL" ? "No orders yet" : `No ${filters.find((item) => item.value === filter)?.label.toLowerCase()} orders`}</Text><Text style={styles.muted}>Your matching orders will appear here.</Text><Pressable onPress={() => router.replace("/")} style={styles.primary}><Text style={styles.primaryText}>Start shopping</Text></Pressable></View>}
  </Screen>;
}

function OrderCard({ compact, onInvoice, onOpen, onTrack, order }: { compact: boolean; onInvoice: () => void; onOpen: () => void; onTrack: () => void; order: CustomerOrderSummary }) {
  const isCancelled = order.status === "CANCELLED";
  const isDelivered = order.status === "DELIVERED";
  const activeStep = isCancelled ? -1 : order.status === "DELIVERED" ? 3 : ["PENDING_PAYMENT", "CONFIRMED"].includes(order.status) ? 0 : ["PROCESSING", "READY_TO_SHIP"].includes(order.status) ? 1 : 2;
  const mainItem = order.previewItems[0];
  return <View style={styles.card}>
    <View style={styles.cardTop}><View><Text style={styles.orderNumber}>{order.orderNumber}</Text><Text style={styles.muted}>{new Date(order.createdAt).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })} - {order.vendorOrderCount} seller package{order.vendorOrderCount === 1 ? "" : "s"}</Text></View><Status status={order.status} /></View>
    <Pressable accessibilityLabel={`Open order ${order.orderNumber}`} accessibilityRole="link" onPress={onOpen} style={[styles.productArea, compact && styles.productAreaCompact]}>
      <ProductPreview items={order.previewItems} />
      <View style={styles.productCopy}><Text numberOfLines={2} style={styles.productTitle}>{mainItem?.name ?? "Order items"}</Text><Text style={styles.muted}>{order.itemCount} item{order.itemCount === 1 ? "" : "s"} total{mainItem ? ` - ${mainItem.sku}` : ""}</Text><Progress activeStep={activeStep} cancelled={isCancelled} /></View>
      <View style={styles.totalBox}><Text style={styles.totalLabel}>Total</Text><Text style={styles.total}>{money(order.total.amountMinor)}</Text><Ionicons color={colors.muted} name="chevron-forward" size={18} /></View>
    </Pressable>
    <View style={styles.actions}><Pressable onPress={onOpen} style={styles.primarySmall}><Text style={styles.primaryText}>View details</Text></Pressable>{!isCancelled && !isDelivered ? <Pressable onPress={onTrack} style={styles.secondary}><Ionicons color={colors.primary} name="navigate-outline" size={16} /><Text style={styles.secondaryText}>Track order</Text></Pressable> : null}<Pressable onPress={onInvoice} style={styles.secondary}><Ionicons color={colors.primary} name="document-text-outline" size={16} /><Text style={styles.secondaryText}>Invoice</Text></Pressable></View>
  </View>;
}

function ProductPreview({ items }: { items: CustomerOrderSummary["previewItems"] }) {
  const visible = items.slice(0, 3);
  return <View style={styles.previewWrap}>{visible.length ? visible.map((item, index) => <View key={`${item.productId}:${item.sku}`} style={[styles.previewFrame, index > 0 && { marginLeft: -16 }]}><Image source={{ uri: item.thumbnailUrl || fallbackImage }} style={styles.previewImage} /><View style={styles.qtyBadge}><Text style={styles.qtyText}>x{item.quantity}</Text></View></View>) : <View style={styles.previewFrame}><Image source={{ uri: fallbackImage }} style={styles.previewImage} /></View>}{items.length > visible.length ? <View style={styles.moreBadge}><Text style={styles.moreText}>+{items.length - visible.length}</Text></View> : null}</View>;
}

function Progress({ activeStep, cancelled }: { activeStep: number; cancelled: boolean }) {
  const steps = cancelled ? ["Cancelled"] : ["Placed", "Packed", "Shipped", "Delivered"];
  return <View style={styles.progress}>{steps.map((step, index) => { const active = cancelled || index <= activeStep; return <View key={step} style={styles.step}><View style={[styles.dot, active && (cancelled ? styles.dotDanger : styles.dotActive)]} />{index < steps.length - 1 ? <View style={[styles.line, active && styles.lineActive]} /> : null}<Text style={[styles.stepText, active && styles.stepTextActive, cancelled && styles.stepTextDanger]}>{step}</Text></View>; })}</View>;
}

function Status({ status }: { status: string }) {
  const isCancelled = status === "CANCELLED";
  const isDelivered = status === "DELIVERED";
  return <Text style={[styles.status, isCancelled && styles.statusDanger, isDelivered && styles.statusSuccess]}>{statusLabel(status)}</Text>;
}

function OrderState({ action, copy, loading, onPress, title }: { action?: string; copy: string; loading?: boolean; onPress?: () => void; title: string }) {
  return <Screen eyebrow="MY ACCOUNT" title={title} description={copy}><View style={styles.empty}>{loading ? <ActivityIndicator color={colors.primary} size="large" /> : <Ionicons color={colors.primary} name="bag-handle-outline" size={48} />}{action && onPress ? <Pressable onPress={onPress} style={styles.primary}><Text style={styles.primaryText}>{action}</Text></Pressable> : null}</View></Screen>;
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", justifyContent: "space-between", padding: spacing.xl },
  heroCompact: { padding: spacing.lg },
  heroCopy: { flex: 1, minWidth: 0 },
  heroTitle: { color: "#fff", fontSize: 28, fontWeight: "900", letterSpacing: -0.6 },
  heroText: { color: "#cbd5e1", lineHeight: 20, marginTop: 5 },
  heroIcon: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, height: 58, justifyContent: "center", width: 58 },
  filters: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 7, padding: 7 },
  filter: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 10 },
  filterActive: { backgroundColor: colors.primary },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: "900" },
  filterTextActive: { color: colors.surface },
  list: { gap: spacing.md },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, overflow: "hidden" },
  cardTop: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, justifyContent: "space-between", padding: spacing.md },
  orderNumber: { color: colors.text, fontSize: 16, fontWeight: "900" },
  muted: { color: colors.muted, flexShrink: 1, fontSize: 11, lineHeight: 18, marginTop: 3 },
  status: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, color: colors.primary, fontSize: 10, fontWeight: "900", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 6 },
  statusSuccess: { backgroundColor: "#ecfdf5", color: colors.success },
  statusDanger: { backgroundColor: "#fef2f2", color: colors.danger },
  productArea: { alignItems: "center", flexDirection: "row", gap: spacing.md, padding: spacing.md },
  productAreaCompact: { alignItems: "flex-start", flexDirection: "column" },
  previewWrap: { alignItems: "center", flexDirection: "row", minWidth: 92 },
  previewFrame: { backgroundColor: "#f8fafc", borderColor: "#fff", borderRadius: radius.md, borderWidth: 3, overflow: "hidden", position: "relative" },
  previewImage: { height: 72, width: 72 },
  qtyBadge: { backgroundColor: "rgba(15,23,42,.78)", borderRadius: radius.pill, bottom: 4, paddingHorizontal: 6, paddingVertical: 2, position: "absolute", right: 4 },
  qtyText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  moreBadge: { alignItems: "center", backgroundColor: colors.primarySoft, borderColor: "#fff", borderRadius: radius.pill, borderWidth: 3, height: 42, justifyContent: "center", marginLeft: -14, width: 42 },
  moreText: { color: colors.primary, fontSize: 11, fontWeight: "900" },
  productCopy: { flex: 1, minWidth: 0 },
  productTitle: { color: colors.text, fontSize: 15, fontWeight: "900", lineHeight: 20 },
  totalBox: { alignItems: "flex-end", gap: 3, marginLeft: "auto" },
  totalLabel: { color: colors.muted, fontSize: 9, fontWeight: "900", textTransform: "uppercase" },
  total: { color: colors.accent, fontSize: 19, fontWeight: "900" },
  progress: { flexDirection: "row", flexWrap: "wrap", gap: 0, marginTop: spacing.md },
  step: { alignItems: "center", flexDirection: "row" },
  dot: { backgroundColor: colors.border, borderRadius: radius.pill, height: 9, width: 9 },
  dotActive: { backgroundColor: colors.primary },
  dotDanger: { backgroundColor: colors.danger },
  line: { backgroundColor: colors.border, height: 2, width: 28 },
  lineActive: { backgroundColor: colors.primary },
  stepText: { color: colors.muted, fontSize: 9, fontWeight: "800", marginHorizontal: 5 },
  stepTextActive: { color: colors.text, fontWeight: "900" },
  stepTextDanger: { color: colors.danger },
  actions: { backgroundColor: colors.background, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "flex-end", padding: spacing.md },
  primary: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 13 },
  primarySmall: { backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", paddingHorizontal: spacing.md, paddingVertical: 10 },
  primaryText: { color: colors.surface, fontWeight: "900" },
  secondary: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: 6, paddingHorizontal: spacing.md, paddingVertical: 10 },
  secondaryText: { color: colors.primary, fontWeight: "900" },
  empty: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderStyle: "dashed", borderWidth: 1, gap: spacing.md, padding: 44 },
  emptyTitle: { color: colors.text, fontSize: 22, fontWeight: "900", textAlign: "center" }
});
