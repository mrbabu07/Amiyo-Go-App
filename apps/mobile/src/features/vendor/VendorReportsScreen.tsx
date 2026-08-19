import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { getVendorReport } from "./vendor.api";

const periods = [7, 30, 90, 365] as const;
const money = (minor: string) => `৳${(Number(minor) / 100).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

export function VendorReportsScreen() {
  const user = firebaseAuth?.currentUser ?? null;
  const [days, setDays] = useState<(typeof periods)[number]>(30);
  const report = useQuery({ queryKey: ["vendor", "report", days], queryFn: () => getVendorReport(user!, days), enabled: Boolean(user) });

  const exportCsv = async () => {
    if (!report.data) return;
    const rows: Array<Array<string | number>> = [
      ["Metric", "Value"],
      ["Period days", report.data.periodDays],
      ["Delivered sales minor", report.data.grossSalesMinor],
      ["Orders", report.data.orderCount],
      ["Delivered", report.data.deliveredCount],
      ["Cancelled", report.data.cancelledCount],
      ["Returns", report.data.returnCount],
      ["Average order minor", report.data.averageOrderMinor],
      ["Fulfilment rate", report.data.fulfilmentRate],
      ["Products", report.data.productCount],
      ["Low-stock variants", report.data.lowStockCount],
      [],
      ["Order ID", "Status", "Total minor", "Created at"],
      ...report.data.recentOrders.map((order) => [order.id, order.status, order.totalMinor, order.createdAt])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    if (Platform.OS === "web") {
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `amiyo-seller-report-${days}d.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      await Share.share({ title: "Amiyo seller report", message: csv });
    }
  };

  return <Screen eyebrow="SELLER CENTER" title="Analytics & reports" description="Track sales, fulfilment, returns and stock health from live seller data.">
    <View style={styles.periods}>
      {periods.map((period) => <Pressable key={period} onPress={() => setDays(period)} style={[styles.period, days === period && styles.activePeriod]}><Text style={[styles.periodText, days === period && styles.activePeriodText]}>{period === 365 ? "1 year" : `${period} days`}</Text></Pressable>)}
      <Pressable disabled={!report.data} onPress={exportCsv} style={[styles.export, !report.data && styles.disabled]}><Text style={styles.exportText}>{Platform.OS === "web" ? "Download CSV" : "Share CSV"}</Text></Pressable>
    </View>
    {report.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
    {report.error ? <Text style={styles.error}>{report.error.message}</Text> : null}
    {report.data ? <>
      <View style={styles.metrics}><Metric label="Delivered sales" value={money(report.data.grossSalesMinor)} /><Metric label="Orders" value={String(report.data.orderCount)} /><Metric label="Average order" value={money(report.data.averageOrderMinor)} /><Metric label="Fulfilment" value={`${report.data.fulfilmentRate}%`} /></View>
      <View style={styles.grid}><ModuleCard title="Order performance" meta={`Last ${report.data.periodDays} days`}><Stat label="Delivered" value={report.data.deliveredCount} tone={colors.success} /><Stat label="Cancelled" value={report.data.cancelledCount} tone={colors.danger} /><Stat label="Returns" value={report.data.returnCount} tone="#c2410c" /></ModuleCard><ModuleCard title="Catalog health" meta="Current inventory"><Stat label="Products" value={report.data.productCount} tone={colors.primary} /><Stat label="Low-stock variants" value={report.data.lowStockCount} tone="#c2410c" /></ModuleCard></View>
      <ModuleCard title="Order status breakdown" meta="Operational pipeline">{Object.entries(report.data.statusCounts).length ? Object.entries(report.data.statusCounts).map(([status, count]) => <View key={status} style={styles.statusRow}><Text style={styles.status}>{status.replaceAll("_", " ")}</Text><View style={styles.track}><View style={[styles.fill, { width: `${Math.max(4, (count / Math.max(1, report.data.orderCount)) * 100)}%` }]} /></View><Text style={styles.count}>{count}</Text></View>) : <Text style={styles.muted}>No orders in this period.</Text>}</ModuleCard>
      <ModuleCard title="Recent orders" meta="Latest activity in selected period">{report.data.recentOrders.map((order) => <View key={order.id} style={styles.order}><View><Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text><Text style={styles.muted}>{new Date(order.createdAt).toLocaleString("en-BD")}</Text></View><Text style={styles.orderStatus}>{order.status.replaceAll("_", " ")}</Text><Text style={styles.orderValue}>{money(order.totalMinor)}</Text></View>)}{!report.data.recentOrders.length ? <Text style={styles.muted}>No recent orders.</Text> : null}</ModuleCard>
    </> : null}
  </Screen>;
}

function Metric({ label, value }: { label: string; value: string }) { return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.muted}>{label}</Text></View>; }
function Stat({ label, tone, value }: { label: string; tone: string; value: number }) { return <View style={styles.stat}><Text style={styles.muted}>{label}</Text><Text style={[styles.statValue, { color: tone }]}>{value}</Text></View>; }

const styles = StyleSheet.create({
  periods: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  period: { borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  activePeriod: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodText: { color: colors.text, fontSize: 12, fontWeight: "600" },
  activePeriodText: { color: "#fff" },
  export: { backgroundColor: colors.text, borderRadius: radius.pill, marginLeft: "auto", paddingHorizontal: 16, paddingVertical: 9 },
  exportText: { color: colors.surface, fontSize: 12, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metric: { backgroundColor: colors.primarySoft, borderRadius: radius.lg, flex: 1, minWidth: 150, padding: spacing.md },
  metricValue: { color: colors.primary, fontSize: 24, fontWeight: "700" },
  muted: { color: colors.muted, fontSize: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  stat: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingVertical: 7 },
  statValue: { fontSize: 18, fontWeight: "700" },
  statusRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  status: { color: colors.text, fontSize: 11, fontWeight: "600", width: 105 },
  track: { backgroundColor: "#e2e8f0", borderRadius: radius.pill, flex: 1, height: 9, overflow: "hidden" },
  fill: { backgroundColor: colors.primary, borderRadius: radius.pill, height: 9 },
  count: { color: colors.text, fontWeight: "700", textAlign: "right", width: 28 },
  order: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, justifyContent: "space-between", paddingVertical: spacing.sm },
  orderId: { color: colors.text, fontWeight: "700" },
  orderStatus: { color: colors.primaryDark, flex: 1, fontSize: 11, fontWeight: "700", textAlign: "center" },
  orderValue: { color: colors.text, fontWeight: "700" },
  error: { color: colors.danger }
});
