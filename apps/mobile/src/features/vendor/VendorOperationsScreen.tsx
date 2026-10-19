import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { formatMinor } from "../../ui/money";
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
  const urgentWork = openReturns + Number(report.data?.lowStockCount ?? 0);

  return <Screen eyebrow="SELLER CENTER" title="Business operations" description="A focused command center for sales, returns, campaigns, and team access.">
    <View style={[styles.hero, compact && styles.heroCompact]}>
      <View style={styles.heroCopy}>
        <Text style={styles.heroEyebrow}>OPERATIONS PULSE</Text>
        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.heroValue}>{formatMinor(report.data?.grossSalesMinor ?? "0")}</Text>
        <Text style={styles.heroText}>Delivered gross sales across the current 30-day reporting window.</Text>
      </View>
      <View style={[styles.priorityCard, compact && styles.priorityCardCompact]}>
        <View style={styles.priorityIcon}><Ionicons color={urgentWork ? colors.warning : colors.success} name={urgentWork ? "flash-outline" : "checkmark-circle-outline"} size={24} /></View>
        <View style={styles.flex}><Text style={styles.priorityValue}>{urgentWork}</Text><Text style={styles.priorityLabel}>{urgentWork ? "priority tasks need attention" : "operations are under control"}</Text></View>
        <Ionicons color={colors.surface} name="arrow-forward" size={18} />
      </View>
    </View>
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
    {report.data ? <ModuleCard title="Fulfillment health" meta="Live delivery and inventory signals for the selected period">
      <Text style={styles.copy}>{report.data.deliveredCount} delivered · {report.data.lowStockCount} low-stock variants · {report.data.fulfilmentRate}% fulfillment rate</Text>
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
  hero: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", gap: spacing.lg, justifyContent: "space-between", padding: spacing.xl },
  heroCompact: { alignItems: "stretch", flexDirection: "column", padding: spacing.lg },
  heroCopy: { flex: 1, minWidth: 0 },
  heroEyebrow: { color: "#E8D7A4", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  heroValue: { color: colors.surface, fontSize: 36, fontWeight: "700", marginTop: spacing.sm },
  heroText: { color: "#C9C2B6", fontSize: 11, lineHeight: 18, marginTop: 4 },
  priorityCard: { alignItems: "center", backgroundColor: "rgba(255,255,255,.1)", borderColor: "rgba(255,255,255,.14)", borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", gap: spacing.sm, minWidth: 270, padding: spacing.md },
  priorityCardCompact: { minWidth: 0, width: "100%" },
  priorityIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,.1)", borderRadius: radius.md, height: 46, justifyContent: "center", width: 46 },
  priorityValue: { color: colors.surface, fontSize: 22, fontWeight: "700" },
  priorityLabel: { color: "#C9C2B6", fontSize: 10, marginTop: 2 },
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
