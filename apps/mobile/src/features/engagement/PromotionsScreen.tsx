import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getPromotions } from "./engagement.api";

const formatStatus = (status: string) => status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

export function PromotionsScreen() {
  const compact = useWindowDimensions().width < 620;
  const router = useRouter();
  const user = useCurrentUser();
  const query = useQuery({ queryKey: ["admin-promotions", user?.uid], queryFn: () => getPromotions(user!), enabled: Boolean(user) });
  if (!user) return <AdminState title="Promotion workspace" copy="Sign in with an administrator account to continue." action="Sign in" onPress={() => router.replace("/auth")} />;
  if (query.isLoading) return <AdminState loading title="Loading promotions" copy="Fetching campaign rules and schedules." />;
  if (query.error) return <AdminState title="Could not load promotions" copy={query.error.message} action="Try again" onPress={() => query.refetch()} />;

  const active = query.data?.filter((item) => item.status.toLowerCase() === "active").length ?? 0;
  const scheduled = query.data?.filter((item) => new Date(item.startsAt).getTime() > Date.now()).length ?? 0;
  return <Screen eyebrow="MARKETING CONTROL" title="Promotions" description="Review deterministic promotion priority, status and campaign windows.">
    <View style={styles.summary}><Summary compact={compact} icon="flash-outline" label="Active" value={active} /><Summary compact={compact} icon="layers-outline" label="Total rules" value={query.data?.length ?? 0} /><Summary compact={compact} icon="calendar-outline" label="Scheduled" value={scheduled} /></View>
    {query.data?.length ? <View style={styles.list}>{query.data.map((item) => {
      const isActive = item.status.toLowerCase() === "active";
      return <View key={item.id} style={[styles.card, compact && styles.cardCompact]}><View style={[styles.icon, isActive && styles.iconActive]}><Ionicons color={isActive ? colors.success : colors.primary} name={isActive ? "flash" : "calendar-outline"} size={22} /></View><View style={styles.flex}><View style={styles.titleRow}><Text accessibilityRole="header" style={styles.title}>{item.name}</Text><Text style={[styles.status, isActive && styles.statusActive]}>{formatStatus(item.status)}</Text></View><Text style={styles.date}>{new Date(item.startsAt).toLocaleString("en-BD")} → {new Date(item.endsAt).toLocaleString("en-BD")}</Text></View><View style={[styles.priority, compact && styles.priorityCompact]}><Text style={styles.priorityValue}>{item.priority}</Text><Text style={styles.priorityLabel}>PRIORITY</Text></View></View>;
    })}</View> : <View style={styles.empty}><Ionicons color={colors.primary} name="pricetags-outline" size={48} /><Text style={styles.emptyTitle}>No promotion rules</Text><Text style={styles.muted}>Created promotion rules will appear here.</Text></View>}
  </Screen>;
}

function Summary({ compact, icon, label, value }: { compact: boolean; icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: number }) { return <View style={[styles.summaryCard, compact && styles.summaryCardCompact]}><View style={styles.summaryIcon}><Ionicons color={colors.primary} name={icon} size={21} /></View><View><Text style={styles.summaryValue}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View></View>; }
function AdminState({ action, copy, loading, onPress, title }: { action?: string; copy: string; loading?: boolean; onPress?: () => void; title: string }) { return <Screen eyebrow="MARKETING CONTROL" title={title} description={copy}><View style={styles.empty}>{loading ? <ActivityIndicator color={colors.primary} size="large" /> : <Ionicons color={colors.primary} name="pricetags-outline" size={48} />}{action && onPress ? <Pressable onPress={onPress} style={styles.button}><Text style={styles.buttonText}>{action}</Text></Pressable> : null}</View></Screen>; }

const styles = StyleSheet.create({ flex: { flex: 1, minWidth: 0 }, summary: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, summaryCard: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, boxShadow: "0 7px 22px rgba(11,31,58,.06)", flex: 1, flexDirection: "row", gap: spacing.md, minWidth: 150, padding: spacing.md }, summaryCardCompact: { flexBasis: "100%", minWidth: 0 }, summaryIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 42, justifyContent: "center", width: 42 }, summaryValue: { color: colors.text, fontSize: 24, fontWeight: "700" }, summaryLabel: { color: colors.muted, fontSize: 11 }, list: { gap: spacing.md }, card: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, boxShadow: "0 8px 24px rgba(11,31,58,.06)", flexDirection: "row", gap: spacing.md, padding: spacing.lg }, cardCompact: { alignItems: "flex-start", flexWrap: "wrap", padding: spacing.md }, icon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 46, justifyContent: "center", width: 46 }, iconActive: { backgroundColor: colors.accentSoft }, titleRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, title: { color: colors.text, fontSize: 17, fontWeight: "700" }, status: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, color: colors.primary, fontSize: 9, fontWeight: "700", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 5 }, statusActive: { backgroundColor: colors.accentSoft, color: colors.success }, date: { color: colors.muted, lineHeight: 19, marginTop: 6 }, priority: { alignItems: "center", backgroundColor: colors.background, borderRadius: radius.md, minWidth: 64, padding: spacing.sm }, priorityCompact: { flexDirection: "row", gap: spacing.sm, justifyContent: "center", width: "100%" }, priorityValue: { color: colors.text, fontSize: 18, fontWeight: "700" }, priorityLabel: { color: colors.muted, fontSize: 8, fontWeight: "700" }, empty: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.xl, gap: spacing.md, padding: 44 }, emptyTitle: { color: colors.text, fontSize: 21, fontWeight: "700" }, muted: { color: colors.muted }, button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 46, paddingHorizontal: spacing.lg }, buttonText: { color: colors.surface, fontWeight: "700" } });
