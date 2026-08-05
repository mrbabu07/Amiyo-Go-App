import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { EngagementState } from "./components/EngagementState";
import { getLoyalty } from "./engagement.api";

const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

export function LoyaltyScreen() {
  const router = useRouter();
  const user = firebaseAuth?.currentUser ?? null;
  const query = useQuery({ queryKey: ["loyalty"], queryFn: () => getLoyalty(user!), enabled: Boolean(user) });

  if (!user) return <EngagementState eyebrow="AMIYO REWARDS" icon="gift-outline" title="Rewards made simple" copy="Sign in to see your points balance and complete earning history." action="Sign in" onPress={() => router.replace("/auth")} />;
  if (query.isLoading) return <EngagementState loading eyebrow="AMIYO REWARDS" icon="gift-outline" title="Loading rewards" copy="Checking your current points ledger." />;
  if (query.error || !query.data) return <EngagementState eyebrow="AMIYO REWARDS" icon="alert-circle-outline" title="Could not load rewards" copy={query.error instanceof Error ? query.error.message : "Please try again."} action="Try again" onPress={() => query.refetch()} />;

  const earned = query.data.transactions.reduce((total, entry) => total + Math.max(0, Number(entry.points)), 0);
  return <Screen eyebrow="AMIYO REWARDS" title="Loyalty points" description="A transparent record of every point earned and redeemed.">
    <View style={styles.hero}><View style={styles.heroTop}><View><Text style={styles.kicker}>AVAILABLE BALANCE</Text><Text accessibilityRole="header" style={styles.balance}>{Number(query.data.pointsBalance).toLocaleString("en-BD")}</Text><Text style={styles.points}>reward points</Text></View><View style={styles.gift}><Ionicons color={colors.surface} name="gift" size={30} /></View></View><View style={styles.heroStats}><View><Text style={styles.statValue}>{earned.toLocaleString("en-BD")}</Text><Text style={styles.statLabel}>Total earned</Text></View><View style={styles.statDivider} /><View><Text style={styles.statValue}>{query.data.transactions.length}</Text><Text style={styles.statLabel}>Transactions</Text></View><View style={styles.version}><Text style={styles.versionText}>LEDGER V{query.data.version}</Text></View></View></View>
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Points activity</Text><Text style={styles.muted}>Newest first</Text></View>
    {query.data.transactions.length ? <View style={styles.list}>{query.data.transactions.map((row) => { const positive = Number(row.points) >= 0; return <View key={row.id} style={styles.entry}><View style={[styles.entryIcon, !positive && styles.entryIconSpent]}><Ionicons color={positive ? colors.success : colors.accent} name={positive ? "arrow-down" : "arrow-up"} size={18} /></View><View style={styles.flex}><Text style={styles.entryTitle}>{label(row.entryType)}</Text><Text style={styles.muted}>{new Date(row.createdAt).toLocaleString("en-BD")}</Text></View><Text style={[styles.amount, !positive && styles.amountSpent]}>{positive ? "+" : ""}{Number(row.points).toLocaleString("en-BD")}</Text></View>; })}</View> : <View style={styles.empty}><Ionicons color={colors.primary} name="sparkles-outline" size={48} /><Text style={styles.emptyTitle}>No points activity yet</Text><Text style={styles.muted}>Eligible marketplace activity will appear in this ledger.</Text></View>}
  </Screen>;
}

const styles = StyleSheet.create({ flex: { flex: 1 }, hero: { backgroundColor: colors.navy, borderRadius: radius.xl, overflow: "hidden", padding: spacing.lg }, heroTop: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" }, kicker: { color: "#7dd3fc", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 }, balance: { color: colors.surface, fontSize: 46, fontWeight: "900", marginTop: 4 }, points: { color: "#cbd5e1" }, gift: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, height: 58, justifyContent: "center", width: 58 }, heroStats: { alignItems: "center", borderTopColor: "#334155", borderTopWidth: 1, flexDirection: "row", gap: spacing.lg, marginTop: spacing.lg, paddingTop: spacing.md }, statValue: { color: colors.surface, fontSize: 18, fontWeight: "900" }, statLabel: { color: "#94a3b8", fontSize: 11 }, statDivider: { alignSelf: "stretch", backgroundColor: "#334155", width: 1 }, version: { backgroundColor: "#334155", borderRadius: radius.pill, marginLeft: "auto", paddingHorizontal: 10, paddingVertical: 6 }, versionText: { color: "#cbd5e1", fontSize: 9, fontWeight: "900" }, sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, sectionTitle: { color: colors.text, fontSize: 20, fontWeight: "900" }, muted: { color: colors.muted, lineHeight: 19 }, list: { gap: spacing.sm }, entry: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md }, entryIcon: { alignItems: "center", backgroundColor: "#ecfdf5", borderRadius: radius.pill, height: 40, justifyContent: "center", width: 40 }, entryIconSpent: { backgroundColor: "#fff7ed" }, entryTitle: { color: colors.text, fontWeight: "900" }, amount: { color: colors.success, fontSize: 18, fontWeight: "900" }, amountSpent: { color: colors.accent }, empty: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderStyle: "dashed", borderWidth: 1, gap: spacing.md, padding: 44 }, emptyTitle: { color: colors.text, fontSize: 21, fontWeight: "900" } });
