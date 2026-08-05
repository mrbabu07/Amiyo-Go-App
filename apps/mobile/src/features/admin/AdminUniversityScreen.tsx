import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";

const guides = [
  ["Approvals & moderation", "Review vendors, KYC, products, categories, reviews and questions before publication.", "shield-checkmark-outline"],
  ["Orders & logistics", "Track the global order queue, delivery exceptions, returns and COD collection workflows.", "car-outline"],
  ["Finance operations", "Verify payments, approve payouts, reconcile COD and complete approved refunds.", "wallet-outline"],
  ["Growth controls", "Manage banners, promotions, coupons, vouchers, offers, flash sales and newsletters.", "megaphone-outline"],
  ["Trust & support", "Investigate risk cases, suspend unsafe accounts and resolve support tickets with an audit trail.", "lock-closed-outline"],
  ["Analytics & audit", "Review marketplace KPIs, vendor performance, customer segments and immutable admin activity.", "analytics-outline"]
] as const;

export function AdminUniversityScreen() { return <Screen eyebrow="ADMIN UNIVERSITY" title="Admin operating guide" description="Protected operator guides for approvals, moderation, finance, logistics, trust, analytics, staff and audit."><View style={styles.notice}><Ionicons color={colors.primary} name="information-circle-outline" size={22} /><Text style={styles.noticeText}>Use the left navigation to open each live workspace. Every write action is permission checked and audit logged.</Text></View><View style={styles.grid}>{guides.map(([title, copy, icon]) => <View key={title} style={styles.card}><View style={styles.icon}><Ionicons color={colors.primary} name={icon} size={22} /></View><Text style={styles.title}>{title}</Text><Text style={styles.copy}>{copy}</Text></View>)}</View><ModuleCard title="Operator checklist" meta="Complete these checks before changing production data."><Text style={styles.copy}>1. Confirm the record identity and current status.</Text><Text style={styles.copy}>2. Review evidence, history and related marketplace activity.</Text><Text style={styles.copy}>3. Add a clear reason for rejection, suspension or escalation.</Text><Text style={styles.copy}>4. Refresh the queue after every write to avoid stale decisions.</Text></ModuleCard></Screen>; }
const styles = StyleSheet.create({ notice: { alignItems: "center", backgroundColor: colors.primarySoft, borderColor: "#bae6fd", borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", gap: spacing.sm, padding: spacing.md }, noticeText: { color: colors.primaryDark, flex: 1, fontSize: 12, lineHeight: 18, fontWeight: "700" }, grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexGrow: 1, minWidth: 260, padding: spacing.lg }, icon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 42, justifyContent: "center", marginBottom: spacing.sm, width: 42 }, title: { color: colors.text, fontSize: 16, fontWeight: "900" }, copy: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 5 } });
