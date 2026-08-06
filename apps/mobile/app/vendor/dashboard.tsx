import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { firebaseAuth } from "../../src/features/auth/firebase";
import { useAuthStore } from "../../src/features/auth/auth.store";
import { getVendorOrders } from "../../src/features/orders/orders.api";
import { getVendorReport, getVendorWorkspace } from "../../src/features/vendor/vendor.api";
import { Screen } from "../../src/ui/Screen";
import { colors, radius, spacing } from "../../src/ui/tokens";

const actions = [
  ["/vendor/products", "Products", "Manage listings and variants", "cube-outline"],
  ["/vendor/orders", "Orders", "Process and dispatch orders", "bag-handle-outline"],
  ["/vendor/inventory", "Inventory", "Update stock and alerts", "layers-outline"],
  ["/vendor/returns", "Returns", "Review customer returns", "return-down-back-outline"],
  ["/vendor/marketing", "Marketing", "Vouchers, reviews and Q&A", "megaphone-outline"],
  ["/vendor/messages", "Messages", "Talk with customers", "chatbubbles-outline"],
  ["/vendor/shop", "Shop profile", "Update storefront details", "storefront-outline"],
  ["/vendor/kyc", "KYC", "Submit verification documents", "id-card-outline"],
  ["/vendor/staff", "Staff access", "Manage team permissions", "people-outline"],
  ["/vendor/finance", "Finance", "Balance, ledger and payouts", "wallet-outline"]
] as const;

export default function VendorDashboardScreen() {
  const router = useRouter();
  const user = firebaseAuth?.currentUser ?? null;
  const session = useAuthStore((state) => state.session);
  const workspace = useQuery({ queryKey: ["vendor", "workspace"], queryFn: () => getVendorWorkspace(user!), enabled: Boolean(user && session?.vendorMemberships.length) });
  const report = useQuery({ queryKey: ["vendor", "report"], queryFn: () => getVendorReport(user!), enabled: Boolean(user && session?.vendorMemberships.length) });
  const orders = useQuery({ queryKey: ["orders", "vendor"], queryFn: () => getVendorOrders(user!), enabled: Boolean(user && session?.vendorMemberships.length) });

  if (!session?.vendorMemberships.length) {
    return <Screen title="Seller registration required" description="Create a seller workspace before opening seller operations."><Pressable onPress={() => router.replace("/vendor/register")} style={styles.primary}><Text style={styles.primaryText}>Start seller registration</Text></Pressable></Screen>;
  }

  const pendingOrders = orders.data?.filter((item) => !["DELIVERED", "REJECTED", "CANCELLED"].includes(item.status)).length ?? 0;
  const status = workspace.data?.status ?? "LOADING";
  return (
    <Screen eyebrow="SELLER CENTER" title={`Welcome back${workspace.data?.displayName ? `, ${workspace.data.displayName}` : ""}`} description="Monitor sales, fulfill orders and grow your Amiyo-Go shop.">
      <View style={styles.hero}>
        <View style={styles.heroCopy}><Text style={styles.heroLabel}>SHOP STATUS</Text><Text style={styles.heroTitle}>{workspace.data?.shops[0]?.name || "Your seller workspace"}</Text><Text style={styles.heroMeta}>{status} · {workspace.data?.shops[0]?.status || "DRAFT"} storefront</Text></View>
        <View style={[styles.status, status === "APPROVED" && styles.statusApproved]}><View style={styles.statusDot} /><Text style={styles.statusText}>{status}</Text></View>
      </View>
      {report.isLoading || orders.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      <View style={styles.metrics}>
        <Metric icon="cash-outline" label="Gross sales" value={`৳${((Number(report.data?.grossSalesMinor ?? 0)) / 100).toLocaleString("en-BD")}`} />
        <Metric icon="bag-check-outline" label="Total orders" value={String(report.data?.orderCount ?? 0)} />
        <Metric icon="time-outline" label="Active orders" value={String(pendingOrders)} />
        <Metric icon="alert-circle-outline" label="Low stock" value={String(report.data?.lowStockCount ?? 0)} />
      </View>
      <View style={styles.sectionRow}><View><Text style={styles.sectionTitle}>Seller tools</Text><Text style={styles.sectionMeta}>Everything you need to operate your shop</Text></View><Pressable onPress={() => router.push("/vendor/operations")}><Text style={styles.link}>View reports →</Text></Pressable></View>
      <View style={styles.grid}>{actions.map(([href, title, copy, icon]) => <Pressable key={href} onPress={() => router.push(href)} style={styles.action}><View style={styles.actionIcon}><Ionicons color={colors.primary} name={icon} size={23} /></View><View style={styles.actionCopy}><Text style={styles.actionTitle}>{title}</Text><Text style={styles.actionMeta}>{copy}</Text></View><Ionicons color={colors.muted} name="chevron-forward" size={18} /></Pressable>)}</View>
      <View style={styles.recentHeader}><Text style={styles.sectionTitle}>Recent orders</Text><Pressable onPress={() => router.push("/vendor/orders")}><Text style={styles.link}>View all →</Text></Pressable></View>
      <View style={styles.orderList}>{orders.data?.slice(0, 5).map((order) => <Pressable key={order.id} onPress={() => router.push(`/vendor/order/${order.id}` as never)} style={styles.order}><View style={styles.orderIcon}><Ionicons color={colors.accent} name="bag-handle-outline" size={20} /></View><View style={styles.actionCopy}><Text style={styles.orderNumber}>{order.orderNumber}</Text><Text style={styles.actionMeta}>{order.items.length} product line{order.items.length === 1 ? "" : "s"} · {order.shopName}</Text></View><View><Text style={styles.orderAmount}>৳{(Number(order.total.amountMinor) / 100).toLocaleString("en-BD")}</Text><Text style={styles.orderStatus}>{order.status.replaceAll("_", " ")}</Text></View></Pressable>)}</View>
    </Screen>
  );
}

function Metric({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: string }) {
  return <View style={styles.metric}><View style={styles.metricIcon}><Ionicons color={colors.primary} name={icon} size={21} /></View><View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View></View>;
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between", padding: spacing.xl }, heroCopy: { flex: 1, minWidth: 250 }, heroLabel: { color: "#7dd3fc", fontSize: 10, fontWeight: "900", letterSpacing: 1 }, heroTitle: { color: colors.surface, fontSize: 24, fontWeight: "900", marginTop: 6 }, heroMeta: { color: "#cbd5e1", marginTop: 5 }, status: { alignItems: "center", backgroundColor: "rgba(245,158,11,.18)", borderRadius: radius.pill, flexDirection: "row", gap: 7, paddingHorizontal: 12, paddingVertical: 8 }, statusApproved: { backgroundColor: "rgba(34,197,94,.18)" }, statusDot: { backgroundColor: "#22c55e", borderRadius: 5, height: 8, width: 8 }, statusText: { color: colors.surface, fontSize: 10, fontWeight: "900" }, metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, metric: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flex: 1, flexDirection: "row", gap: spacing.md, minWidth: 210, padding: spacing.md }, metricIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 45, justifyContent: "center", width: 45 }, metricValue: { color: colors.text, fontSize: 20, fontWeight: "900" }, metricLabel: { color: colors.muted, fontSize: 11, marginTop: 2 }, sectionRow: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between" }, sectionTitle: { color: colors.text, fontSize: 20, fontWeight: "900" }, sectionMeta: { color: colors.muted, fontSize: 11, marginTop: 3 }, link: { color: colors.primary, fontSize: 12, fontWeight: "900" }, grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, action: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", gap: spacing.sm, minWidth: 285, padding: spacing.md, width: "32%" }, actionIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 44, justifyContent: "center", width: 44 }, actionCopy: { flex: 1 }, actionTitle: { color: colors.text, fontWeight: "900" }, actionMeta: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 3 }, recentHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, orderList: { gap: spacing.sm }, order: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md }, orderIcon: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.md, height: 42, justifyContent: "center", width: 42 }, orderNumber: { color: colors.text, fontWeight: "900" }, orderAmount: { color: colors.text, fontWeight: "900", textAlign: "right" }, orderStatus: { color: colors.primary, fontSize: 9, fontWeight: "900", marginTop: 4, textAlign: "right" }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md }, primaryText: { color: colors.surface, fontWeight: "900" }
});
