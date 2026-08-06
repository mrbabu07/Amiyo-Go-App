import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { getVendorReturns } from "../vendor/vendor.api";
import { getReturns } from "./operations.api";

const statuses = ["REQUESTED", "REVIEWING", "APPROVED", "PICKUP_SCHEDULED", "RECEIVED", "INSPECTED", "REFUND_PENDING", "REFUNDED", "CLOSED"];
const money = (minor: string) => `৳${(Number(minor) / 100).toLocaleString("en-BD")}`;

export function ReturnDetailScreen({ id, vendor = false }: { id: string; vendor?: boolean }) {
  const router = useRouter();
  const user = firebaseAuth?.currentUser ?? null;
  const query = useQuery({ queryKey: [vendor ? "vendor" : "customer", "return", id], queryFn: () => vendor ? getVendorReturns(user!) : getReturns(user!), enabled: Boolean(user) });
  const item = query.data?.find((row) => row.id === id);
  if (query.isLoading) return <Screen title="Return details"><ActivityIndicator color={colors.primary} /></Screen>;
  if (!item) return <Screen title="Return unavailable" description="This return could not be found in your account."><Pressable onPress={() => router.replace(vendor ? "/vendor/returns" : "/returns")} style={styles.primary}><Text style={styles.primaryText}>Back to returns</Text></Pressable></Screen>;
  const currentIndex = statuses.indexOf(item.status);
  const terminal = item.status === "REJECTED";
  return <Screen eyebrow={vendor ? "SELLER RETURN" : "RETURN TRACKING"} title={`Return #${item.id.slice(0, 8).toUpperCase()}`} description="Review the request, item values and current after-sales progress.">
    <View style={styles.toolbar}><Pressable onPress={() => router.replace(vendor ? "/vendor/returns" : "/returns")} style={styles.link}><Ionicons color={colors.primary} name="arrow-back" size={18} /><Text style={styles.linkText}>All returns</Text></Pressable><Text style={[styles.status, terminal && styles.rejected]}>{item.status.replaceAll("_", " ")}</Text></View>
    <View style={styles.metrics}><Metric label="Requested" value={money(item.requestedAmount.amountMinor)} /><Metric label="Approved" value={item.approvedAmount ? money(item.approvedAmount.amountMinor) : "Pending"} /><Metric label="Items" value={String(item.items.reduce((sum, row) => sum + row.quantity, 0))} /></View>
    <View style={styles.columns}><ModuleCard title="Request details" meta={new Date(item.createdAt).toLocaleString("en-BD")}><Text style={styles.reason}>{item.reasonCode.replaceAll("_", " ")}</Text><Text style={styles.muted}>{item.reasonDetail || "No additional details were provided."}</Text><Pressable onPress={() => router.push(vendor ? `/vendor/order/${item.vendorOrderId}` as never : `/order/${item.orderId}` as never)} style={styles.outline}><Text style={styles.outlineText}>Open related order</Text></Pressable></ModuleCard><ModuleCard title="Progress timeline" meta={terminal ? "Request closed without approval" : "Updated as operations processes the return"}>{terminal ? <Timeline active danger label="Return rejected" /> : statuses.map((status, index) => <Timeline active={index <= currentIndex} key={status} label={status.replaceAll("_", " ")} />)}</ModuleCard></View>
    <ModuleCard title="Returned items" meta={`${item.items.length} line item${item.items.length === 1 ? "" : "s"}`}>{item.items.map((row) => <View key={row.id} style={styles.item}><View style={styles.itemIcon}><Ionicons color={colors.primary} name="cube-outline" size={20} /></View><View style={styles.flex}><Text style={styles.itemTitle}>Order item #{row.orderItemId.slice(0, 8).toUpperCase()}</Text><Text style={styles.muted}>Quantity {row.quantity}</Text></View><Text style={styles.amount}>{money(row.requestedAmount.amountMinor)}</Text></View>)}</ModuleCard>
  </Screen>;
}

function Metric({ label, value }: { label: string; value: string }) { return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }
function Timeline({ active, danger, label }: { active?: boolean; danger?: boolean; label: string }) { return <View style={styles.timeline}><Ionicons color={danger ? colors.danger : active ? colors.success : colors.border} name={danger ? "close-circle" : active ? "checkmark-circle" : "ellipse-outline"} size={20} /><Text style={[styles.timelineText, active && styles.timelineActive]}>{label}</Text></View>; }
const styles = StyleSheet.create({ toolbar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, link: { alignItems: "center", flexDirection: "row", gap: 6 }, linkText: { color: colors.primary, fontWeight: "900" }, status: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, color: colors.primary, fontSize: 9, fontWeight: "900", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 6 }, rejected: { backgroundColor: "#fef2f2", color: colors.danger }, metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, metric: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flex: 1, minWidth: 170, padding: spacing.md }, metricValue: { color: colors.text, fontSize: 20, fontWeight: "900" }, metricLabel: { color: colors.muted, fontSize: 10, marginTop: 3 }, columns: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, reason: { color: colors.text, fontSize: 18, fontWeight: "900", textTransform: "capitalize" }, muted: { color: colors.muted, lineHeight: 19 }, outline: { alignItems: "center", borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, minHeight: 44, justifyContent: "center" }, outlineText: { color: colors.primary, fontWeight: "900" }, timeline: { alignItems: "center", flexDirection: "row", gap: spacing.sm, minHeight: 35 }, timelineText: { color: colors.muted, fontSize: 11 }, timelineActive: { color: colors.text, fontWeight: "800" }, item: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md }, itemIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 40, justifyContent: "center", width: 40 }, flex: { flex: 1 }, itemTitle: { color: colors.text, fontWeight: "900" }, amount: { color: colors.accent, fontWeight: "900" }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, minHeight: 46, justifyContent: "center" }, primaryText: { color: colors.surface, fontWeight: "900" } });
