import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getVendorReport, getVendorReturns, getVendorStaff, getVendorVouchers } from "./vendor.api";

const modules = [
  ["/vendor/reports", "Reports", "Sales, fulfilment and stock health", "stats-chart-outline"],
  ["/vendor/returns", "Returns", "Review and process customer returns", "return-down-back-outline"],
  ["/vendor/marketing", "Marketing", "Create vouchers and growth campaigns", "megaphone-outline"],
  ["/vendor/staff", "Staff access", "Manage team roles and permissions", "people-outline"]
] as const;

export function VendorOperationsScreen() {
  const router = useRouter();
  const user = useCurrentUser();
  const compact = useWindowDimensions().width < 620;
  const report = useQuery({ queryKey: ["vendor", "report", user?.uid, 30], queryFn: () => getVendorReport(user!, 30), enabled: Boolean(user) });
  const returns = useQuery({ queryKey: ["vendor", "returns", user?.uid], queryFn: () => getVendorReturns(user!), enabled: Boolean(user) });
  const staff = useQuery({ queryKey: ["vendor", "staff", user?.uid], queryFn: () => getVendorStaff(user!), enabled: Boolean(user) });
  const vouchers = useQuery({ queryKey: ["vendor", "vouchers", user?.uid], queryFn: () => getVendorVouchers(user!), enabled: Boolean(user) });
  const loading = report.isLoading || returns.isLoading || staff.isLoading || vouchers.isLoading;
  const error = report.error || returns.error || staff.error || vouchers.error;
  const openReturns = returns.data?.filter((item) => !["refunded", "rejected", "closed"].includes(item.status.toLowerCase())).length ?? 0;
  const activeStaff = staff.data?.filter((item) => item.status === "active").length ?? 0;
  const activeVouchers = vouchers.data?.filter((item) => item.active && new Date(item.endsAt) > new Date()).length ?? 0;

  return <Screen eyebrow="SELLER CENTER" title="Business operations" description="A focused command center for sales, returns, campaigns, and team access.">
    {loading ? <ActivityIndicator color={colors.primary} /> : null}
    <View style={styles.metrics}>
      <Metric compact={compact} label="Orders (30 days)" value={report.data?.orderCount ?? 0} />
      <Metric compact={compact} label="Open returns" value={openReturns} />
      <Metric compact={compact} label="Active staff" value={activeStaff} />
      <Metric compact={compact} label="Live vouchers" value={activeVouchers} />
    </View>
    <View style={styles.grid}>
      {modules.map(([href, title, copy, icon]) => <Pressable
        accessibilityRole="link"
        key={href}
        onPress={() => router.push(href)}
        style={({ pressed }) => [styles.module, compact && styles.moduleCompact, pressed && styles.pressed]}
      >
        <View style={styles.icon}><Ionicons color={colors.primary} name={icon} size={24} /></View>
        <View style={styles.flex}><Text style={styles.title}>{title}</Text><Text style={styles.copy}>{copy}</Text></View>
        <Ionicons color={colors.muted} name="chevron-forward" size={19} />
      </Pressable>)}
    </View>
    {report.data ? <ModuleCard title={`৳${(Number(report.data.grossSalesMinor) / 100).toLocaleString("en-BD")}`} meta="Delivered gross sales in the selected 30-day overview">
      <Text style={styles.copy}>{report.data.deliveredCount} delivered · {report.data.lowStockCount} low-stock variants</Text>
    </ModuleCard> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error.message}</Text> : null}
  </Screen>;
}

function Metric({ compact, label, value }: { compact: boolean; label: string; value: number }) {
  return <View style={[styles.metric, compact && styles.metricCompact]}>
    <Text adjustsFontSizeToFit numberOfLines={1} style={styles.metricValue}>{value}</Text>
    <Text style={styles.copy}>{label}</Text>
  </View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metric: { backgroundColor: colors.primarySoft, borderRadius: radius.lg, flex: 1, minWidth: 130, padding: spacing.md },
  metricCompact: { minWidth: "45%" },
  metricValue: { color: colors.primary, fontSize: 26, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  module: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, flex: 1, flexDirection: "row", gap: spacing.md, minWidth: 260, padding: spacing.lg },
  moduleCompact: { minWidth: 0, padding: spacing.md, width: "100%" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  icon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 48, justifyContent: "center", width: 48 },
  title: { color: colors.text, fontSize: 16, fontWeight: "700" },
  copy: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  error: { color: colors.danger }
});
