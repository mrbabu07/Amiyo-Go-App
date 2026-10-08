import type { CustomerOrderSummary } from "@amiyo/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getCustomerOrders } from "./orders.api";
import { CustomerOrderExpansion } from "./CustomerOrderExpansion";

import { orderFilters as filters, orderStatusGroup, orderProgressStep, type OrderFilter as Filter } from "./order-list-presentation";

import { OrderItemImage } from "./OrderItemImage";
const money = (minor: string) => `Tk ${(Number(minor) / 100).toLocaleString("en-BD")}`;
const statusLabel = (status: string) => status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

function matchesFilter(order: CustomerOrderSummary, filter: Filter) {
  return filter === "ALL" || orderStatusGroup(order.status) === filter;
}

export function CustomerOrdersScreen() {
  const router = useRouter();
  const user = useCurrentUser();
  const { width } = useWindowDimensions();
  const compact = width < 520;
  const [filter, setFilter] = useState<Filter>("ALL");
  const orders = useQuery({ queryKey: ["orders", "customer", user?.uid], queryFn: () => getCustomerOrders(user!), enabled: Boolean(user), retry: false, refetchInterval: 30_000 });
  const visibleOrders = useMemo(() => orders.data?.filter((order) => matchesFilter(order, filter)) ?? [], [filter, orders.data]);


  if (!user) return <OrderState title="Your orders are private" copy="Sign in to view purchases, delivery updates and invoices." action="Sign in" onPress={() => router.replace("/auth")} />;
  if (orders.isLoading) return <OrderState loading title="Loading your orders" copy="Fetching your latest purchase history." />;
  if (orders.error) return <OrderState title="Could not load orders" copy={orders.error instanceof Error ? orders.error.message : "Please try again."} action="Try again" onPress={() => orders.refetch()} />;

  return <Screen hideHeading title="My Orders">
    <View style={[styles.pageHeader, compact && styles.headerCompact]}>
      <View style={styles.headingCopy}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to account" onPress={() => router.push("/account")} style={styles.back}><Ionicons name="arrow-back" size={22} color={colors.text} /></Pressable>
        <View style={styles.headingText}><Text accessibilityRole="header" style={styles.pageTitle}>My Orders</Text><Text style={styles.muted}>Track and manage your orders</Text></View>
      </View>
      <View style={styles.headerActions}>
        <Link href="/returns" asChild><Pressable accessibilityRole="link" style={styles.secondary}><Text style={styles.secondaryText}>My Returns</Text></Pressable></Link>
        <Link href="/" asChild><Pressable accessibilityRole="link" style={styles.primarySmall}><Text style={styles.primaryText}>Continue Shopping</Text></Pressable></Link>
      </View>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={compact} style={styles.filterScroll} contentContainerStyle={styles.filters}>
      <View accessibilityRole="tablist" style={styles.filterRow}>{filters.map((item) => {
        const count = orders.data?.filter((order) => matchesFilter(order, item.value)).length ?? 0;
        return <Pressable accessibilityRole="tab" accessibilityLabel={`${item.label}, ${count} orders`} accessibilityState={{ selected: filter === item.value }} key={item.value} onPress={() => setFilter(item.value)} style={[styles.filter, filter === item.value && styles.filterActive]}><Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>{item.label}</Text><View style={styles.countBadge}><Text style={styles.countText}>{count}</Text></View></Pressable>;
      })}</View>
    </ScrollView>
    {visibleOrders.length ? <View style={styles.list}>{visibleOrders.map((order) => <OrderCard compact={compact} key={order.id} order={order} />)}</View> : <View style={styles.empty}><Ionicons color={colors.primary} name="receipt-outline" size={48} /><Text accessibilityRole="header" style={styles.emptyTitle}>{filter === "ALL" ? "No orders yet" : `No ${filters.find((item) => item.value === filter)?.label.toLowerCase()} orders`}</Text><Text style={styles.muted}>Your matching orders will appear here.</Text><Pressable accessibilityRole="button" onPress={() => router.replace("/")} style={styles.primary}><Text style={styles.primaryText}>Start shopping</Text></Pressable></View>}
  </Screen>;
}

function OrderCard({ compact, order }: { compact: boolean; order: CustomerOrderSummary }) {
  const [expanded, setExpanded] = useState(false);
  const isCancelled = order.status === "CANCELLED";
  const isDelivered = order.status === "DELIVERED";
  const activeStep = orderProgressStep(order.status);
  const mainItem = order.previewItems[0];
  return <View style={styles.card}>
    <View style={[styles.cardTop, compact && styles.headerCompact]}><View style={styles.headingText}><Text style={styles.orderNumber}>{order.orderNumber}</Text><Text style={styles.muted}>{new Date(order.createdAt).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })} - {order.vendorOrderCount} seller package{order.vendorOrderCount === 1 ? "" : "s"}</Text></View><Status status={order.status} /></View>
    <Pressable accessibilityLabel={`${expanded ? "Collapse" : "Expand"} order ${order.orderNumber}`} accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded((value) => !value)} style={StyleSheet.flatten([styles.productArea, compact && styles.productAreaCompact])}>
      <ProductPreview items={order.previewItems} />
      <View style={[styles.productCopy, compact && styles.productCopyCompact]}><Text numberOfLines={2} style={styles.productTitle}>{mainItem?.name ?? "Order items"}</Text><Text style={styles.muted}>{order.itemCount} item{order.itemCount === 1 ? "" : "s"} total{mainItem ? ` - ${mainItem.sku}` : ""}</Text>{activeStep !== null ? <Progress activeStep={activeStep} cancelled={false} /> : <Text style={styles.muted}>{statusLabel(order.status)} — open details for recorded updates.</Text>}</View>
      <View style={styles.totalBox}><Text style={styles.totalLabel}>Total</Text><Text style={styles.total}>{money(order.total.amountMinor)}</Text><Ionicons color={colors.muted} name={expanded ? "chevron-up" : "chevron-down"} size={18} /><Text style={styles.muted}>{expanded ? "Hide details" : "Show details"}</Text></View>
    </Pressable>
    {expanded ? <CustomerOrderExpansion id={order.id} compact={compact} /> : null}
    <View style={styles.actions}>
      <Link href={`/order/${order.id}` as never} asChild><Pressable accessibilityRole="link" accessibilityLabel={`View details for ${order.orderNumber}`} style={styles.primarySmall}><Text style={styles.primaryText}>View details</Text></Pressable></Link>
      {orderStatusGroup(order.status) !== "RETURN" && !isCancelled && !isDelivered ? <Link href={`/order/${order.id}/tracking` as never} asChild><Pressable accessibilityRole="link" accessibilityLabel={`Track order ${order.orderNumber}`} style={styles.secondary}><Ionicons color={colors.primary} name="navigate-outline" size={16} /><Text style={styles.secondaryText}>Track order</Text></Pressable></Link> : null}
      <Link href={`/order/${order.id}/invoice` as never} asChild><Pressable accessibilityRole="link" accessibilityLabel={`Invoice for ${order.orderNumber}`} style={styles.secondary}><Ionicons color={colors.primary} name="document-text-outline" size={16} /><Text style={styles.secondaryText}>Invoice</Text></Pressable></Link>
    </View>
  </View>;
}

function ProductPreview({ items }: { items: CustomerOrderSummary["previewItems"] }) {
  const visible = items.slice(0, 3);
  return <View style={styles.previewWrap}>{visible.length ? visible.map((item, index) => <View key={`${item.productId}:${item.sku}`} style={[styles.previewFrame, index > 0 && { marginLeft: -16 }]}><OrderItemImage name={item.name} uri={item.thumbnailUrl} /><View style={styles.qtyBadge}><Text style={styles.qtyText}>x{item.quantity}</Text></View></View>) : <View style={styles.previewFrame}><OrderItemImage name="Order item" /></View>}{items.length > visible.length ? <View style={styles.moreBadge}><Text style={styles.moreText}>+{items.length - visible.length}</Text></View> : null}</View>;
}

function Progress({ activeStep, cancelled }: { activeStep: number; cancelled: boolean }) {
  const steps = cancelled ? ["Cancelled"] : ["Placed", "Processing", "Shipped", "Delivered"];
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
  pageHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg },
  headerCompact: { flexDirection: "column", alignItems: "stretch" },
  headingCopy: { flexDirection: "row", alignItems: "center", gap: spacing.md, flexShrink: 1, minWidth: 0 },
  headingText: { flexShrink: 1, minWidth: 0 },
  pageTitle: { color: colors.text, fontSize: 28, fontWeight: "600" },
  back: { height: 44, width: 44, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, borderRadius: radius.md },
  headerActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  filterScroll: { flexGrow: 0 },
  filterRow: { flexDirection: "row", gap: spacing.sm },
  countBadge: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  countText: { color: colors.primary, fontSize: 11, fontWeight: "600" },
  productCopyCompact: { flexGrow: 0, flexShrink: 0, flexBasis: "auto", width: "100%" },
  filters: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 7, padding: 7 },
  filter: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 44, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10 },
  filterActive: { backgroundColor: colors.primary },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  filterTextActive: { color: colors.surface },
  list: { gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, overflow: "hidden" },
  cardTop: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, justifyContent: "space-between", padding: spacing.md },
  orderNumber: { color: colors.text, fontSize: 16, fontWeight: "700" },
  muted: { color: colors.muted, flexShrink: 1, fontSize: 11, lineHeight: 18, marginTop: 3 },
  status: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, color: colors.primary, fontSize: 10, fontWeight: "700", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 6 },
  statusSuccess: { backgroundColor: colors.accentSoft, color: colors.success },
  statusDanger: { backgroundColor: colors.primarySoft, color: colors.danger },
  productArea: { alignItems: "center", flexDirection: "row", gap: spacing.md, padding: spacing.md },
  productAreaCompact: { alignItems: "flex-start", flexDirection: "column" },
  previewWrap: { alignItems: "center", flexDirection: "row", minWidth: 92 },
  previewFrame: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: "hidden", position: "relative" },
  qtyBadge: { backgroundColor: "rgba(15,23,42,.78)", borderRadius: radius.pill, bottom: 4, paddingHorizontal: 6, paddingVertical: 2, position: "absolute", right: 4 },
  qtyText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  moreBadge: { alignItems: "center", backgroundColor: colors.primarySoft, borderColor: colors.surface, borderRadius: radius.pill, borderWidth: 3, height: 42, justifyContent: "center", marginLeft: -14, width: 42 },
  moreText: { color: colors.primary, fontSize: 11, fontWeight: "700" },
  productCopy: { flex: 1, minWidth: 0 },
  productTitle: { color: colors.text, fontSize: 15, fontWeight: "700", lineHeight: 20 },
  totalBox: { alignItems: "flex-end", gap: 3, marginLeft: "auto" },
  totalLabel: { color: colors.muted, fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  total: { color: colors.accent, fontSize: 19, fontWeight: "700" },
  progress: { flexDirection: "row", flexWrap: "wrap", gap: 0, marginTop: spacing.md },
  step: { alignItems: "center", flexDirection: "row" },
  dot: { backgroundColor: colors.border, borderRadius: radius.pill, height: 9, width: 9 },
  dotActive: { backgroundColor: colors.primary },
  dotDanger: { backgroundColor: colors.danger },
  line: { backgroundColor: colors.border, height: 2, width: 28 },
  lineActive: { backgroundColor: colors.primary },
  stepText: { color: colors.muted, fontSize: 9, fontWeight: "600", marginHorizontal: 5 },
  stepTextActive: { color: colors.text, fontWeight: "700" },
  stepTextDanger: { color: colors.danger },
  actions: { backgroundColor: colors.background, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "flex-end", padding: spacing.md },
  primary: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 13 },
  primarySmall: { backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: 10 },
  primaryText: { color: colors.surface, fontWeight: "700" },
  secondary: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: 6, minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: 10 },
  secondaryText: { color: colors.primary, fontWeight: "700" },
  empty: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderStyle: "dashed", borderWidth: 1, gap: spacing.md, padding: 44 },
  emptyTitle: { color: colors.text, fontSize: 22, fontWeight: "700", textAlign: "center" }
});
