import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";

const guides = [
  ["Approvals & moderation", "Review vendors, KYC, products, categories, reviews and questions before publication.", "shield-checkmark-outline", "/admin/vendors"],
  ["Orders & logistics", "Inspect seller packages, delivery events, exceptions, returns and customer support evidence.", "cube-outline", "/admin/orders"],
  ["Finance operations", "Verify payments, commission rules, seller balances, payout requests and settlement references.", "wallet-outline", "/admin/payouts"],
  ["Trust & governance", "Manage access, audit trails, fraud signals, privacy requests and production safeguards.", "lock-closed-outline", "/admin/audit"],
  ["Growth operations", "Control banners, vouchers, flash sales, newsletters and campaign visibility.", "megaphone-outline", "/admin/promotions"],
  ["Analytics", "Use bounded date ranges and exported evidence before making operational decisions.", "analytics-outline", "/admin/analytics"]
] as const;

export function AdminUniversityScreen() {
  const compact = useWindowDimensions().width < 620;
  const router = useRouter();
  return <Screen eyebrow="ADMIN UNIVERSITY" title="Admin operating guide" description="Protected operator guides for approvals, moderation, finance, logistics, trust, analytics, staff and audit.">
    <View style={styles.notice}><Ionicons color={colors.primary} name="information-circle-outline" size={22} /><Text style={styles.noticeText}>Use the navigation to open each live workspace. Every write action is permission checked and audit logged.</Text></View>
    <View style={styles.grid}>{guides.map(([title, copy, icon, href]) => <Pressable accessibilityRole="link" key={title} onPress={() => router.push(href as never)} style={[styles.card, compact && styles.cardCompact]}><View style={styles.icon}><Ionicons color={colors.primary} name={icon} size={22} /></View><Text style={styles.title}>{title}</Text><Text style={styles.copy}>{copy}</Text><View style={styles.openGuide}><Text style={styles.openGuideText}>Open workspace</Text><Ionicons color={colors.primary} name="arrow-forward" size={16} /></View></Pressable>)}</View>
    <ModuleCard title="Operator checklist" meta="Complete these checks before changing production data."><Text style={styles.copy}>1. Confirm the record identity and current status.</Text><Text style={styles.copy}>2. Review evidence, history and related marketplace activity.</Text><Text style={styles.copy}>3. Add a clear reason for rejection, suspension or escalation.</Text><Text style={styles.copy}>4. Refresh the queue after every write to avoid stale decisions.</Text></ModuleCard>
  </Screen>;
}

const styles = StyleSheet.create({
  notice: { alignItems: "center", backgroundColor: colors.primarySoft, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  noticeText: { color: colors.primaryDark, flex: 1, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexGrow: 1, minWidth: 260, padding: spacing.lg },
  cardCompact: { flexBasis: "100%", minWidth: 0, width: "100%" },
  icon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 42, justifyContent: "center", marginBottom: spacing.sm, width: 42 },
  title: { color: colors.text, fontSize: 16, fontWeight: "700" },
  copy: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 5 }, openGuide: { alignItems: "center", flexDirection: "row", gap: 6, marginTop: spacing.md }, openGuideText: { color: colors.primary, fontSize: 11, fontWeight: "700" }
});
