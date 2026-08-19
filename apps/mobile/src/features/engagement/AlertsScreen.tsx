import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { EngagementState } from "./components/EngagementState";
import { getAlerts, removeAlert } from "./engagement.api";

const money = (minor: string) => `৳${(Number(minor) / 100).toLocaleString("en-BD")}`;

export function AlertsScreen() {
  const router = useRouter();
  const user = firebaseAuth?.currentUser ?? null;
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ["alerts"], queryFn: () => getAlerts(user!), enabled: Boolean(user) });
  const remove = useMutation({ mutationFn: (productId: string) => removeAlert(user!, productId), onSuccess: (data) => cache.setQueryData(["alerts"], data) });

  if (!user) return <EngagementState eyebrow="SMART SHOPPING" icon="notifications-outline" title="Never miss an update" copy="Sign in to manage stock and target-price alerts." action="Sign in" onPress={() => router.replace("/auth")} />;
  if (query.isLoading) return <EngagementState loading eyebrow="SMART SHOPPING" icon="notifications-outline" title="Loading product alerts" copy="Checking your saved notification rules." />;
  if (query.error) return <EngagementState eyebrow="SMART SHOPPING" icon="alert-circle-outline" title="Could not load alerts" copy={query.error.message} action="Try again" onPress={() => query.refetch()} />;

  return <Screen eyebrow="SMART SHOPPING" title="Product alerts" description="Track stock availability and price targets from one place.">
    <View style={styles.summary}><View style={styles.summaryIcon}><Ionicons color={colors.surface} name="notifications" size={25} /></View><View style={styles.flex}><Text accessibilityRole="header" style={styles.summaryTitle}>{query.data?.length ?? 0} active alert{query.data?.length === 1 ? "" : "s"}</Text><Text style={styles.summaryCopy}>We notify you when a saved condition is met.</Text></View></View>
    {query.data?.length ? <View style={styles.list}>{query.data.map((item) => <View key={item.id} style={styles.card}><View style={styles.productIcon}><Ionicons color={colors.primary} name={item.target ? "pricetag-outline" : "cube-outline"} size={22} /></View><View style={styles.flex}><Text style={styles.name}>{item.productName}</Text><Text style={styles.muted}>{item.target ? `Notify below ${money(item.target.amountMinor)}` : "Notify when available"}</Text><Text style={styles.date}>Created {new Date(item.createdAt).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}</Text></View><Pressable accessibilityLabel={`Turn off alert for ${item.productName}`} disabled={remove.isPending} onPress={() => remove.mutate(item.productId)} style={styles.remove}><Ionicons color={colors.danger} name="trash-outline" size={18} /><Text style={styles.removeText}>{remove.isPending ? "Removing…" : "Turn off"}</Text></Pressable></View>)}</View> : <View style={styles.empty}><Ionicons color={colors.primary} name="notifications-off-outline" size={52} /><Text style={styles.emptyTitle}>No active alerts</Text><Text style={styles.muted}>Open a product and create a stock or target-price alert.</Text><Pressable onPress={() => router.replace("/")} style={styles.primary}><Text style={styles.primaryText}>Explore products</Text></Pressable></View>}
    {remove.error ? <Text style={styles.error}>{remove.error.message}</Text> : null}
  </Screen>;
}

const styles = StyleSheet.create({ flex: { flex: 1 }, summary: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.lg, flexDirection: "row", gap: spacing.md, padding: spacing.lg }, summaryIcon: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, height: 48, justifyContent: "center", width: 48 }, summaryTitle: { color: colors.surface, fontSize: 20, fontWeight: "700" }, summaryCopy: { color: "#cbd5e1", marginTop: 3 }, list: { gap: spacing.md }, card: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: spacing.md, padding: spacing.lg }, productIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 44, justifyContent: "center", width: 44 }, name: { color: colors.text, fontSize: 16, fontWeight: "700" }, muted: { color: colors.muted, lineHeight: 20, marginTop: 3 }, date: { color: colors.muted, fontSize: 11, marginTop: 5 }, remove: { alignItems: "center", borderColor: "#fecaca", borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: 6, paddingHorizontal: spacing.md, paddingVertical: 10 }, removeText: { color: colors.danger, fontWeight: "700" }, empty: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderStyle: "dashed", borderWidth: 1, gap: spacing.md, padding: 44 }, emptyTitle: { color: colors.text, fontSize: 22, fontWeight: "700" }, primary: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 13 }, primaryText: { color: colors.surface, fontWeight: "700" }, error: { backgroundColor: "#fef2f2", borderRadius: radius.md, color: colors.danger, padding: spacing.md } });
