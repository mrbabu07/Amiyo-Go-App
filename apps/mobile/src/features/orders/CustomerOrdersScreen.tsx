import type { CustomerOrderSummary } from "@amiyo/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { getCustomerOrders } from "./orders.api";

type Filter = "ALL" | "ACTIVE" | "DELIVERED" | "CANCELLED";
const filters: Array<{ label: string; value: Filter }> = [
  { label: "All orders", value: "ALL" },
  { label: "In progress", value: "ACTIVE" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" }
];

const money = (minor: string) => `৳${(Number(minor) / 100).toLocaleString("en-BD")}`;
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
  const [filter, setFilter] = useState<Filter>("ALL");
  const orders = useQuery({ queryKey: ["orders", "customer"], queryFn: () => getCustomerOrders(user!), enabled: Boolean(user) });
  const visibleOrders = useMemo(() => orders.data?.filter((order) => matchesFilter(order, filter)) ?? [], [filter, orders.data]);

  if (!user) return <OrderState title="Your orders are private" copy="Sign in to view purchases, delivery updates and invoices." action="Sign in" onPress={() => router.replace("/auth")} />;
  if (orders.isLoading) return <OrderState loading title="Loading your orders" copy="Fetching your latest purchase history." />;
  if (orders.error) return <OrderState title="Could not load orders" copy={orders.error instanceof Error ? orders.error.message : "Please try again."} action="Try again" onPress={() => orders.refetch()} />;

  return <Screen eyebrow="MY ACCOUNT" title="My orders" description="Track deliveries, review purchases and download invoices.">
    <View style={styles.summaryStrip}>
      <View><Text style={styles.summaryNumber}>{orders.data?.length ?? 0}</Text><Text style={styles.summaryLabel}>Total orders</Text></View>
      <View style={styles.summaryDivider} />
      <View><Text style={styles.summaryNumber}>{orders.data?.filter((order) => matchesFilter(order, "ACTIVE")).length ?? 0}</Text><Text style={styles.summaryLabel}>In progress</Text></View>
      <Ionicons color={colors.primary} name="bag-check-outline" size={34} />
    </View>
    <View accessibilityRole="tablist" style={styles.filters}>{filters.map((item) => <Pressable accessibilityRole="tab" accessibilityState={{ selected: filter === item.value }} key={item.value} onPress={() => setFilter(item.value)} style={[styles.filter, filter === item.value && styles.filterActive]}><Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>{item.label}</Text></Pressable>)}</View>
    {visibleOrders.length ? <View style={styles.list}>{visibleOrders.map((order) => <OrderCard key={order.id} order={order} onInvoice={() => router.push(`/order/${order.id}/invoice` as never)} onOpen={() => router.push(`/order/${order.id}` as never)} onTrack={() => router.push(`/order/${order.id}/tracking` as never)} />)}</View> : <View style={styles.empty}><Ionicons color={colors.primary} name="receipt-outline" size={48} /><Text accessibilityRole="header" style={styles.emptyTitle}>{filter === "ALL" ? "No orders yet" : `No ${filters.find((item) => item.value === filter)?.label.toLowerCase()}`}</Text><Text style={styles.muted}>Your matching orders will appear here.</Text><Pressable onPress={() => router.replace("/")} style={styles.primary}><Text style={styles.primaryText}>Start shopping</Text></Pressable></View>}
  </Screen>;
}

function OrderCard({ onInvoice, onOpen, onTrack, order }: { onInvoice: () => void; onOpen: () => void; onTrack: () => void; order: CustomerOrderSummary }) {
  const isCancelled = order.status === "CANCELLED";
  const isDelivered = order.status === "DELIVERED";
  return <View style={styles.card}>
    <Pressable accessibilityLabel={`Open order ${order.orderNumber}`} accessibilityRole="button" onPress={onOpen} style={styles.cardMain}>
      <View style={styles.cardHeader}><View style={styles.orderIcon}><Ionicons color={colors.primary} name="cube-outline" size={22} /></View><View style={styles.orderCopy}><Text style={styles.orderNumber}>{order.orderNumber}</Text><Text style={styles.muted}>{new Date(order.createdAt).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })} · {order.vendorOrderCount} seller{order.vendorOrderCount === 1 ? "" : "s"}</Text></View><Text style={[styles.status, isCancelled && styles.statusDanger, isDelivered && styles.statusSuccess]}>{statusLabel(order.status)}</Text></View>
      <View style={styles.cardTotal}><Text style={styles.totalLabel}>Order total</Text><Text style={styles.total}>{money(order.total.amountMinor)}</Text></View>
    </Pressable>
    <View style={styles.actions}><Pressable onPress={onOpen} style={styles.primarySmall}><Text style={styles.primaryText}>View details</Text></Pressable>{!isCancelled && !isDelivered ? <Pressable onPress={onTrack} style={styles.secondary}><Ionicons color={colors.primary} name="navigate-outline" size={16} /><Text style={styles.secondaryText}>Track</Text></Pressable> : null}<Pressable onPress={onInvoice} style={styles.secondary}><Ionicons color={colors.primary} name="document-text-outline" size={16} /><Text style={styles.secondaryText}>Invoice</Text></Pressable></View>
  </View>;
}

function OrderState({ action, copy, loading, onPress, title }: { action?: string; copy: string; loading?: boolean; onPress?: () => void; title: string }) {
  return <Screen eyebrow="MY ACCOUNT" title={title} description={copy}><View style={styles.empty}>{loading ? <ActivityIndicator color={colors.primary} size="large" /> : <Ionicons color={colors.primary} name="bag-handle-outline" size={48} />}{action && onPress ? <Pressable onPress={onPress} style={styles.primary}><Text style={styles.primaryText}>{action}</Text></Pressable> : null}</View></Screen>;
}

const styles = StyleSheet.create({
  summaryStrip: { alignItems: "center", backgroundColor: colors.primarySoft, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", gap: spacing.lg, justifyContent: "space-between", padding: spacing.lg }, summaryNumber: { color: colors.text, fontSize: 24, fontWeight: "900" }, summaryLabel: { color: colors.muted, fontSize: 12, marginTop: 2 }, summaryDivider: { alignSelf: "stretch", backgroundColor: colors.border, width: 1 }, filters: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, filter: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 10 }, filterActive: { backgroundColor: colors.primary, borderColor: colors.primary }, filterText: { color: colors.muted, fontSize: 12, fontWeight: "800" }, filterTextActive: { color: colors.surface }, list: { gap: spacing.md }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, overflow: "hidden" }, cardMain: { gap: spacing.md, padding: spacing.lg }, cardHeader: { alignItems: "center", flexDirection: "row", gap: spacing.sm }, orderIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 42, justifyContent: "center", width: 42 }, orderCopy: { flex: 1 }, orderNumber: { color: colors.text, fontSize: 16, fontWeight: "900" }, muted: { color: colors.muted, lineHeight: 19 }, status: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, color: colors.primary, fontSize: 10, fontWeight: "900", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 6 }, statusSuccess: { backgroundColor: "#ecfdf5", color: colors.success }, statusDanger: { backgroundColor: "#fef2f2", color: colors.danger }, cardTotal: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingTop: spacing.md }, totalLabel: { color: colors.muted, fontWeight: "700" }, total: { color: colors.accent, fontSize: 20, fontWeight: "900" }, actions: { backgroundColor: colors.background, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, padding: spacing.md }, primary: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 13 }, primarySmall: { backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", paddingHorizontal: spacing.md, paddingVertical: 10 }, primaryText: { color: colors.surface, fontWeight: "900" }, secondary: { alignItems: "center", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: 6, paddingHorizontal: spacing.md, paddingVertical: 10 }, secondaryText: { color: colors.primary, fontWeight: "900" }, empty: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderStyle: "dashed", borderWidth: 1, gap: spacing.md, padding: 44 }, emptyTitle: { color: colors.text, fontSize: 22, fontWeight: "900", textAlign: "center" }
});
