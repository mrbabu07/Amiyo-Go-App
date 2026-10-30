import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getAdminDataIntegrity } from "./admin.api";

export function AdminDataIntegrityScreen() {
  const user = useCurrentUser(); const router = useRouter();
  const query = useQuery({ queryKey: ["admin", "data-integrity", user?.uid], queryFn: () => getAdminDataIntegrity(user!), enabled: Boolean(user), staleTime: 15_000, retry: false });
  const data = query.data;
  return <Screen eyebrow="DATA GOVERNANCE" title="Data integrity" description="Read-only marketplace health, reconciliation queues and database-backed entity visibility. Corrections stay inside audited operational workflows.">
    {query.isLoading ? <ActivityIndicator color={colors.primary} /> : query.error ? <Text style={styles.error}>{query.error.message}</Text> : data ? <>
      <View style={[styles.health, data.healthy ? styles.healthy : styles.attention]}><Ionicons color={data.healthy ? colors.success : colors.warning} name={data.healthy ? "shield-checkmark" : "warning"} size={24} /><View style={styles.flex}><Text style={styles.healthTitle}>{data.healthy ? "Core checks are clear" : "Operational review needed"}</Text><Text style={styles.muted}>Generated {new Date(data.generatedAt).toLocaleString()} · {data.auditEventsLast24Hours} audit events in 24 hours</Text></View><Pressable onPress={() => query.refetch()} style={styles.refresh}><Ionicons color={colors.primary} name="refresh" size={19} /></Pressable></View>
      <View style={styles.metrics}>{Object.entries(data.entities).map(([label, value]) => <View key={label} style={styles.metric}><Text style={styles.metricValue}>{value.toLocaleString()}</Text><Text style={styles.metricLabel}>{label}</Text></View>)}</View>
      <ModuleCard title="Integrity and reconciliation checks" meta="A non-zero issue opens the responsible admin workspace; no raw SQL or unrestricted record editing is exposed.">
        <View style={styles.list}>{data.checks.map((check) => <Pressable key={check.key} onPress={() => router.push(check.route as never)} style={styles.row}><View style={[styles.icon, check.count > 0 && check.severity === "critical" ? styles.criticalIcon : check.count > 0 ? styles.warningIcon : styles.okIcon]}><Ionicons color={check.count > 0 && check.severity === "critical" ? colors.danger : check.count > 0 ? colors.warning : colors.success} name={check.count > 0 ? "alert-circle-outline" : "checkmark-circle-outline"} size={20} /></View><View style={styles.flex}><Text style={styles.rowTitle}>{check.label}</Text><Text style={styles.muted}>{check.count === 0 ? "No issue detected" : `${check.count.toLocaleString()} item(s) require review`}</Text></View><Text style={[styles.count, check.count > 0 && styles.countAlert]}>{check.count}</Text><Ionicons color={colors.muted} name="chevron-forward" size={18} /></Pressable>)}</View>
      </ModuleCard>
      <ModuleCard title="Safety boundary" meta="Database governance"><Text style={styles.copy}>Admins can inspect operational records, audit changes, reconcile finance and correct data through permission-checked screens. Direct database browsing, arbitrary SQL and unrestricted deletion are intentionally excluded because they bypass validation, audit evidence and financial controls.</Text></ModuleCard>
    </> : null}
  </Screen>;
}

const styles = StyleSheet.create({ health: { alignItems: "center", borderRadius: radius.lg, flexDirection: "row", gap: spacing.sm, padding: spacing.md }, healthy: { backgroundColor: colors.accentSoft }, attention: { backgroundColor: colors.primarySoft }, flex: { flex: 1 }, healthTitle: { color: colors.text, fontSize: 16, fontWeight: "700" }, muted: { color: colors.muted, fontSize: 11, lineHeight: 17 }, refresh: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.pill, height: 40, justifyContent: "center", width: 40 }, metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, metric: { backgroundColor: colors.surface, borderRadius: radius.md, flex: 1, minWidth: 120, padding: spacing.md }, metricValue: { color: colors.text, fontSize: 22, fontWeight: "700" }, metricLabel: { color: colors.muted, fontSize: 10, fontWeight: "700", textTransform: "uppercase" }, list: { gap: spacing.xs }, row: { alignItems: "center", backgroundColor: colors.background, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, minHeight: 64, padding: spacing.sm }, icon: { alignItems: "center", borderRadius: radius.pill, height: 38, justifyContent: "center", width: 38 }, okIcon: { backgroundColor: colors.accentSoft }, warningIcon: { backgroundColor: colors.primarySoft }, criticalIcon: { backgroundColor: colors.primarySoft }, rowTitle: { color: colors.text, fontSize: 12, fontWeight: "700" }, count: { color: colors.success, fontSize: 16, fontWeight: "700" }, countAlert: { color: colors.danger }, copy: { color: colors.muted, fontSize: 12, lineHeight: 20 }, error: { color: colors.danger } });
