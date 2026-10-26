import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useRef } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { EngagementState } from "./components/EngagementState";
import { getAlerts, removeAlert, type ProductAlert } from "./engagement.api";
import { alertMinorToPrice } from "./alert-price";
import { FlashAlertsPanel } from "./FlashAlerts";

const money = (minor: string) => `৳${alertMinorToPrice(minor)}`;

export function AlertsScreen() {
  const compact = useWindowDimensions().width < 600;
  const router = useRouter();
  const user = useCurrentUser();
  const activeUid = useRef(user?.uid); activeUid.current = user?.uid;
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ["alerts", user?.uid ?? null], queryFn: () => getAlerts(user!), enabled: Boolean(user) });
  const remove = useMutation({ mutationFn: async (item: ProductAlert) => {
    if (!user || activeUid.current !== user.uid) throw new Error("Sign in to manage alerts");
    const data = await removeAlert(user, item.productId, item.target ? "price" : "stock");
    return { data, uid: user.uid };
  }, onSuccess: ({ data, uid }) => {
    if (activeUid.current !== uid) return;
    cache.setQueryData(["alerts", uid], data);
  } });

  if (!user) return <EngagementState eyebrow="SMART SHOPPING" icon="notifications-outline" title="Never miss an update" copy="Sign in to manage stock and target-price alerts." action="Sign in" onPress={() => router.replace("/auth")} />;
  if (query.isLoading) return <EngagementState loading eyebrow="SMART SHOPPING" icon="notifications-outline" title="Loading product alerts" copy="Checking your saved notification rules." />;
  if (query.error) return <EngagementState eyebrow="SMART SHOPPING" icon="alert-circle-outline" title="Could not load alerts" copy={query.error.message} action="Try again" onPress={() => query.refetch()} />;
  const priceCount = query.data?.filter((item) => item.target).length ?? 0;
  const stockCount = (query.data?.length ?? 0) - priceCount;

  return <Screen eyebrow="SMART SHOPPING" title="Product alerts" description="Track stock availability and price targets from one place.">
    <View style={[styles.summary, alertStyles.summary, compact && alertStyles.summaryCompact]}><View style={alertStyles.summaryLead}><View style={styles.summaryIcon}><Ionicons color={colors.background} name="notifications" size={25} /></View><View style={styles.flex}><Text accessibilityRole="header" style={styles.summaryTitle}>{query.data?.length ?? 0} active alert{query.data?.length === 1 ? "" : "s"}</Text><Text style={[styles.summaryCopy, alertStyles.summaryCopy]}>We notify you when each saved condition is met.</Text></View></View><View style={[alertStyles.summaryMetrics, compact && alertStyles.summaryMetricsCompact]}><AlertMetric icon="pricetag-outline" label="Price" value={priceCount} /><AlertMetric icon="cube-outline" label="Stock" value={stockCount} /></View></View>
    {query.data?.length ? <View style={styles.list}>{query.data.map((item) => { const removing = remove.isPending && remove.variables?.id === item.id; return <View key={item.id} style={[styles.card, alertStyles.card]}><View style={styles.productIcon}><Ionicons color={colors.primary} name={item.target ? "pricetag-outline" : "cube-outline"} size={22} /></View><View style={styles.flex}><Text style={alertStyles.type}>{item.target ? "PRICE ALERT" : "STOCK ALERT"}</Text><Pressable accessibilityRole="link" accessibilityLabel={`View ${item.productName}`} onPress={() => router.push(`/product/${item.productId}` as never)} style={styles.productLink}><Text style={styles.name}>{item.productName}</Text></Pressable><Text style={styles.muted}>{item.target ? `Notify at or below ${money(item.target.amountMinor)}` : "Notify when available"}</Text><Text style={styles.date}>Created {new Date(item.createdAt).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Turn off ${item.target ? "price" : "stock"} alert for ${item.productName}`} disabled={remove.isPending} onPress={() => remove.mutate(item)} style={[styles.remove, alertStyles.remove, compact && styles.removeCompact, remove.isPending && alertStyles.disabled]}><Ionicons color={colors.danger} name="trash-outline" size={18} /><Text style={styles.removeText}>{removing ? "Removing…" : "Turn off"}</Text></Pressable></View>; })}</View> : <View style={styles.empty}><Ionicons color={colors.primary} name="notifications-off-outline" size={52} /><Text style={styles.emptyTitle}>No stock or price alerts</Text><Text style={styles.muted}>Open a product and create a stock or target-price alert.</Text><Pressable onPress={() => router.replace("/")} style={styles.primary}><Text style={styles.primaryText}>Explore products</Text></Pressable></View>}
    {remove.error ? <Text style={styles.error}>{remove.error.message}</Text> : null}
    <FlashAlertsPanel key={user.uid} />
  </Screen>;
}

function AlertMetric({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: number }) { return <View style={alertStyles.metric}><Ionicons color={colors.accent} name={icon} size={17} /><View><Text style={alertStyles.metricValue}>{value}</Text><Text style={alertStyles.metricLabel}>{label}</Text></View></View>; }

const alertStyles = StyleSheet.create({ summary: { justifyContent: "space-between" }, summaryCompact: { alignItems: "stretch", flexDirection: "column" }, summaryLead: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.md }, summaryCopy: { color: colors.background, opacity: 0.75 }, summaryMetrics: { flexDirection: "row", gap: spacing.sm }, summaryMetricsCompact: { width: "100%" }, metric: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.md, flex: 1, flexDirection: "row", gap: spacing.sm, minWidth: 88, padding: spacing.sm }, metricValue: { color: colors.navy, fontSize: 17, fontWeight: "700" }, metricLabel: { color: colors.muted, fontSize: 9, fontWeight: "600" }, card: { borderWidth: 0 }, type: { color: colors.primary, fontSize: 9, fontWeight: "700", letterSpacing: 0.8 }, remove: { backgroundColor: colors.primarySoft, borderWidth: 0 }, disabled: { opacity: 0.45 } });

const styles = StyleSheet.create({ flex: { flex: 1, minWidth: 0 }, productLink: { minHeight: 44, justifyContent: "center" }, summary: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.lg, flexDirection: "row", gap: spacing.md, padding: spacing.lg }, summaryIcon: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, height: 48, justifyContent: "center", width: 48 }, summaryTitle: { color: colors.surface, fontSize: 20, fontWeight: "700" }, summaryCopy: { color: colors.shellMuted, marginTop: 3 }, list: { gap: spacing.md }, card: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: spacing.md, padding: spacing.lg }, productIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 44, justifyContent: "center", width: 44 }, name: { color: colors.text, fontSize: 16, fontWeight: "700" }, muted: { color: colors.muted, lineHeight: 20, marginTop: 3 }, date: { color: colors.muted, fontSize: 11, marginTop: 5 }, remove: { alignItems: "center", borderColor: colors.danger, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: 6, paddingHorizontal: spacing.md, paddingVertical: 10 }, removeCompact: { width: "100%", minHeight: 44, justifyContent: "center" }, removeText: { color: colors.danger, fontWeight: "700" }, empty: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderStyle: "dashed", borderWidth: 1, gap: spacing.md, padding: 44 }, emptyTitle: { color: colors.text, fontSize: 22, fontWeight: "700" }, primary: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 13 }, primaryText: { color: colors.surface, fontWeight: "700" }, error: { backgroundColor: colors.primarySoft, borderRadius: radius.md, color: colors.danger, padding: spacing.md } });
