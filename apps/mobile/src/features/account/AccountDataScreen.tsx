import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { exportMyAccount } from "../auth/auth.api";
import { firebaseAuth } from "../auth/firebase";
import { AccountState } from "./components/AccountState";

export function AccountDataScreen() {
  const router = useRouter();
  const user = firebaseAuth?.currentUser ?? null;
  const data = useQuery({ queryKey: ["me", "export"], queryFn: () => exportMyAccount(user!), enabled: Boolean(user) });
  if (!user) return <AccountState icon="document-lock-outline" title="Your account data" copy="Sign in to view your portable marketplace data export." action="Sign in" onPress={() => router.replace("/auth")} />;
  if (data.isLoading) return <AccountState loading icon="document-lock-outline" title="Preparing your data" copy="Collecting your account and marketplace records." />;
  if (data.error || !data.data) return <AccountState icon="alert-circle-outline" title="Could not prepare export" copy={data.error instanceof Error ? data.error.message : "Please try again."} action="Try again" onPress={() => data.refetch()} />;

  const stats = [{ label: "Addresses", value: data.data.addresses.length, icon: "location-outline" }, { label: "Orders", value: data.data.orders.length, icon: "bag-handle-outline" }, { label: "Returns", value: data.data.returns.length, icon: "return-down-back-outline" }, { label: "Reviews", value: data.data.reviews.length, icon: "star-outline" }, { label: "Support", value: data.data.supportTickets.length, icon: "help-circle-outline" }];
  return <Screen eyebrow="PRIVACY" title="Your account data" description="A portable snapshot of your personal information and marketplace activity."><View style={styles.hero}><View style={styles.heroIcon}><Ionicons color={colors.surface} name="shield-checkmark" size={27} /></View><View style={styles.flex}><Text accessibilityRole="header" style={styles.heroTitle}>Export ready</Text><Text style={styles.heroCopy}>Generated {new Date(data.data.generatedAt).toLocaleString("en-BD")}</Text></View></View><View style={styles.grid}>{stats.map((item) => <View key={item.label} style={styles.stat}><Ionicons color={colors.primary} name={item.icon as never} size={21} /><Text style={styles.statValue}>{item.value}</Text><Text style={styles.statLabel}>{item.label}</Text></View>)}</View><View style={styles.jsonCard}><View style={styles.jsonHeader}><Text style={styles.jsonTitle}>Portable JSON</Text><Text style={styles.badge}>READ ONLY</Text></View><Text selectable style={styles.json}>{JSON.stringify(data.data, null, 2)}</Text></View></Screen>;
}

const styles = StyleSheet.create({ flex: { flex: 1 }, hero: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.lg, flexDirection: "row", gap: spacing.md, padding: spacing.lg }, heroIcon: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, height: 50, justifyContent: "center", width: 50 }, heroTitle: { color: colors.surface, fontSize: 20, fontWeight: "900" }, heroCopy: { color: "#cbd5e1", marginTop: 3 }, grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, stat: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexGrow: 1, gap: 5, minWidth: 120, padding: spacing.md }, statValue: { color: colors.text, fontSize: 24, fontWeight: "900" }, statLabel: { color: colors.muted, fontSize: 11 }, jsonCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, overflow: "hidden" }, jsonHeader: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: spacing.md }, jsonTitle: { color: colors.text, fontWeight: "900" }, badge: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, color: colors.primary, fontSize: 9, fontWeight: "900", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 5 }, json: { color: colors.muted, fontFamily: "monospace", fontSize: 11, lineHeight: 17, padding: spacing.md } });
