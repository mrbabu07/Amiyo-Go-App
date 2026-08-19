import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { getAdminAnalytics } from "./admin.api";
import { buildAdminAnalyticsCsv } from "./analytics-report";

const ranges = ["7d", "30d", "90d"] as const;
const money = (value: string) => `৳${(Number(value) / 100).toLocaleString("en-BD")}`;

export function AdminAnalyticsScreen() {
  const user = firebaseAuth?.currentUser ?? null;
  const [range, setRange] = useState<typeof ranges[number]>("30d");
  const [exportError, setExportError] = useState("");
  const analytics = useQuery({ queryKey: ["admin", "analytics", range], queryFn: () => getAdminAnalytics(user!, range), enabled: Boolean(user) });
  const maximumRevenue = Math.max(1, ...(analytics.data?.trend.map((item) => Number(item.revenue.amountMinor)) ?? []));
  const exportCsv = async () => {
    if (!analytics.data) return;
    setExportError("");
    try {
      const csv = buildAdminAnalyticsCsv(analytics.data);
      const fileName = `amiyo-analytics-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      } else await Share.share({ title: fileName, message: csv });
    } catch (error) { setExportError(error instanceof Error ? error.message : "Could not export analytics"); }
  };
  return <Screen eyebrow="MARKETPLACE INTELLIGENCE" title="Analytics & customer insights" description="Live performance, purchasing segments and seller/product rankings from marketplace transactions.">
    <View style={styles.filters}>{ranges.map((item) => <Pressable accessibilityRole="button" key={item} onPress={() => setRange(item)} style={[styles.filter, range === item && styles.filterActive]}><Text style={[styles.filterText, range === item && styles.filterTextActive]}>{item.replace("d", " days")}</Text></Pressable>)}<Pressable accessibilityRole="button" disabled={!analytics.data} onPress={exportCsv} style={[styles.export, !analytics.data && styles.disabled]}><Text style={styles.exportText}>{Platform.OS === "web" ? "Download CSV" : "Share CSV"}</Text></Pressable></View>
    {analytics.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
    {analytics.error ? <Text style={styles.error}>{analytics.error.message}</Text> : null}
    {exportError ? <Text style={styles.error}>{exportError}</Text> : null}
    {analytics.data ? <>
      <View style={styles.metrics}>
        <Metric label="GMV" value={money(analytics.data.summary.gmv.amountMinor)} />
        <Metric label="Orders" value={analytics.data.summary.orders.toLocaleString()} />
        <Metric label="Average order" value={money(analytics.data.summary.averageOrderValue.amountMinor)} />
        <Metric label="Repeat rate" value={`${analytics.data.summary.repeatPurchaseRate.toFixed(1)}%`} />
        <Metric label="Purchasing customers" value={analytics.data.summary.purchasingCustomers.toLocaleString()} />
        <Metric label="New accounts" value={analytics.data.summary.newCustomers.toLocaleString()} />
      </View>
      <ModuleCard title="Daily GMV trend" meta={`${new Date(analytics.data.range.startsAt).toLocaleDateString()} – ${new Date(analytics.data.range.endsAt).toLocaleDateString()}`}>
        {analytics.data.trend.map((item) => <View key={item.date} style={styles.trendRow}><Text style={styles.date}>{new Date(`${item.date}T00:00:00`).toLocaleDateString("en-BD", { day: "2-digit", month: "short" })}</Text><View style={styles.track}><View style={[styles.bar, { width: `${Math.max(3, Number(item.revenue.amountMinor) / maximumRevenue * 100)}%` }]} /></View><Text style={styles.trendValue}>{money(item.revenue.amountMinor)}</Text></View>)}
        {analytics.data.trend.length === 0 ? <Text style={styles.muted}>No completed marketplace activity in this period.</Text> : null}
      </ModuleCard>
      <Text style={styles.heading}>Customer segments</Text>
      <View style={styles.metrics}>{analytics.data.segments.map((segment) => <Metric key={segment.key} label={`${segment.key.toUpperCase()} · ${segment.orders} orders`} value={`${segment.customers} customers`} detail={money(segment.revenue.amountMinor)} />)}</View>
      <Text style={styles.heading}>Top products</Text>
      {analytics.data.topProducts.map((product, index) => <ModuleCard key={product.id} title={`${index + 1}. ${product.name}`} meta={`${product.quantity} units sold`}><Text style={styles.rankingValue}>{money(product.revenue.amountMinor)}</Text></ModuleCard>)}
      <Text style={styles.heading}>Top vendors</Text>
      {analytics.data.topVendors.map((vendor, index) => <ModuleCard key={vendor.id} title={`${index + 1}. ${vendor.name}`} meta={`${vendor.orders} seller orders`}><Text style={styles.rankingValue}>{money(vendor.revenue.amountMinor)}</Text></ModuleCard>)}
    </> : null}
  </Screen>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) { return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text>{detail ? <Text style={styles.muted}>{detail}</Text> : null}</View>; }
const styles = StyleSheet.create({ filters: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, filter: { borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, filterActive: { backgroundColor: colors.primary, borderColor: colors.primary }, filterText: { color: colors.muted, fontWeight: "600" }, filterTextActive: { color: colors.surface }, export: { backgroundColor: colors.text, borderRadius: radius.pill, marginLeft: "auto", paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, exportText: { color: colors.surface, fontWeight: "700" }, disabled: { opacity: 0.45 }, metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, metric: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexBasis: 160, flexGrow: 1, gap: 4, padding: spacing.md }, metricLabel: { color: colors.muted, fontSize: 12, fontWeight: "600" }, metricValue: { color: colors.text, fontSize: 22, fontWeight: "700" }, heading: { color: colors.text, fontSize: 21, fontWeight: "700" }, trendRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm }, date: { color: colors.muted, fontSize: 11, width: 52 }, track: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, flex: 1, height: 9, overflow: "hidden" }, bar: { backgroundColor: colors.primary, borderRadius: radius.pill, height: 9 }, trendValue: { color: colors.text, fontSize: 11, fontWeight: "700", textAlign: "right", width: 78 }, rankingValue: { color: colors.primary, fontSize: 20, fontWeight: "700" }, muted: { color: colors.muted, fontSize: 12 }, error: { color: colors.danger } });
