import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getAdminCommerce, getAdminWorkspace, updateAdminVendor } from "./admin.api";

export function AdminVendorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useCurrentUser();
  const userId = user?.uid ?? null;
  const compact = useWindowDimensions().width < 620;
  const router = useRouter();
  const cache = useQueryClient();
  const workspace = useQuery({ queryKey: ["admin", "workspace", userId], queryFn: () => getAdminWorkspace(user!), enabled: Boolean(user && id), retry: false });
  const commerce = useQuery({ queryKey: ["admin", "commerce", userId], queryFn: () => getAdminCommerce(user!), enabled: Boolean(user && id), retry: false });
  const vendor = workspace.data?.vendors.find((item) => item.id === id);
  const activity = commerce.data?.vendorActivity.find((item) => item.id === id);
  const orders = commerce.data?.orders.filter((item) => item.vendorOrders.some((vendorOrder) => vendorOrder.vendorId === id)) ?? [];
  const chats = commerce.data?.chats.filter((item) => item.vendorId === id) ?? [];
  const currentActor = () => { if (!user || user.uid !== userId) throw new Error("Account changed. Reopen vendor detail."); return user; };
  const status = useMutation({
    retry: false,
    mutationFn: (next: "APPROVED" | "REJECTED" | "SUSPENDED") => updateAdminVendor(currentActor(), id!, { status: next, reason: `Vendor ${next.toLowerCase()} from vendor detail review` }),
    onSuccess: async () => {
      if (user?.uid !== userId) return;
      await Promise.all([cache.invalidateQueries({ queryKey: ["admin", "workspace", userId] }), cache.invalidateQueries({ queryKey: ["admin", "commerce", userId] })]);
    }
  });

  if (workspace.isLoading || commerce.isLoading) return <Screen title="Vendor detail"><ActivityIndicator color={colors.primary} /></Screen>;
  const error = workspace.error || commerce.error || status.error;

  return <Screen eyebrow="VENDOR 360" title={vendor?.displayName ?? "Vendor detail"} description="Seller identity, marketplace activity, orders, chats and finance exposure in one view.">
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error.message}</Text> : null}
    {vendor ? <>
      <View style={[styles.hero, compact && styles.heroCompact]}><View style={styles.flex}><Text style={[styles.legal, styles.heroText]}>{vendor.legalName}</Text><Text style={styles.heroMeta}>{vendor.latestKycStatus ?? "No KYC"} · {vendor.shopCount} shops · {vendor.memberCount} members</Text></View><Text style={styles.badge}>{vendor.status}</Text></View>
      <View style={styles.metrics}><Metric compact={compact} label="GMV" value={`৳${(Number(activity?.gmvMinor ?? 0) / 100).toLocaleString("en-BD")}`} /><Metric compact={compact} label="Orders" value={String(activity?.orders ?? 0)} /><Metric compact={compact} label="Products" value={String(activity?.products ?? 0)} /><Metric compact={compact} label="Chats" value={String(activity?.chats ?? 0)} /></View>
      <ModuleCard title="Vendor access" meta="Every decision is written to the platform audit trail."><View style={[styles.actions, compact && styles.actionsCompact]}>{(["APPROVED", "SUSPENDED", "REJECTED"] as const).map((next) => <Pressable disabled={status.isPending || vendor.status === next} key={next} onPress={() => status.mutate(next)} style={[styles.action, compact && styles.actionCompact, next !== "APPROVED" && styles.danger]}><Text style={[styles.actionText, next !== "APPROVED" && styles.dangerText]}>{next}</Text></Pressable>)}</View></ModuleCard>
      <ModuleCard title={`Recent orders · ${orders.length}`}>{orders.slice(0, 12).map((order) => <Pressable key={order.id} onPress={() => router.push(`/admin/orders/${order.id}` as never)} style={[styles.listRow, compact && styles.listRowCompact]}><View style={styles.flex}><Text style={styles.legal}>{order.orderNumber}</Text><Text style={styles.meta}>{order.customer} · {new Date(order.createdAt).toLocaleDateString("en-BD")}</Text></View><Text style={styles.link}>Manage →</Text></Pressable>)}</ModuleCard>
      <ModuleCard title={`Vendor chats · ${chats.length}`}>{chats.slice(0, 12).map((chat) => <Pressable key={chat.id} onPress={() => router.push(`/admin/chat/${chat.id}` as never)} style={[styles.listRow, compact && styles.listRowCompact]}><View style={styles.flex}><Text style={styles.legal}>{chat.subject}</Text><Text numberOfLines={2} style={styles.meta}>{chat.lastMessage ?? "No messages"}</Text></View><Text style={styles.link}>Open →</Text></Pressable>)}</ModuleCard>
    </> : <ModuleCard title="Vendor not found" meta="The requested seller record is unavailable." />}
  </Screen>;
}

function Metric({ compact, label, value }: { compact: boolean; label: string; value: string }) { return <View style={[styles.metric, compact && styles.metricCompact]}><Text adjustsFontSizeToFit numberOfLines={1} style={styles.metricValue}>{value}</Text><Text style={styles.meta}>{label}</Text></View>; }

const styles = StyleSheet.create({
  flex: { flex: 1 }, error: { color: colors.danger }, hero: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.lg, flexDirection: "row", gap: spacing.md, padding: spacing.lg }, heroCompact: { alignItems: "flex-start", flexDirection: "column", padding: spacing.md }, legal: { color: colors.text, fontWeight: "700" }, heroText: { color: colors.surface }, heroMeta: { color: colors.border, fontSize: 11, lineHeight: 18, marginTop: 3 }, meta: { color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 3 }, badge: { backgroundColor: colors.primary, borderRadius: radius.pill, color: colors.surface, fontSize: 10, fontWeight: "700", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 6 }, metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, metric: { backgroundColor: colors.surface, borderRadius: radius.lg, flex: 1, minWidth: 150, padding: spacing.md }, metricCompact: { minWidth: "45%" }, metricValue: { color: colors.text, fontSize: 21, fontWeight: "700" }, actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, actionsCompact: { width: "100%" }, action: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.sm, justifyContent: "center", minHeight: 44, paddingHorizontal: 11 }, actionCompact: { flex: 1, minWidth: "45%" }, actionText: { color: colors.primary, fontSize: 10, fontWeight: "700" }, danger: { backgroundColor: colors.primarySoft, borderColor: colors.danger, borderWidth: 1 }, dangerText: { color: colors.danger }, listRow: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.sm }, listRowCompact: { alignItems: "flex-start", flexWrap: "wrap" }, link: { color: colors.primary, fontSize: 11, fontWeight: "700" }
});
