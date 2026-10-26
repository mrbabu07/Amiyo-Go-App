import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { formatMinor, sumMinor } from "../../ui/money";
import { useCurrentUser } from "../auth/use-current-user";
import { accessAdminPaymentEvidence, getAdminPaymentVerifications, reviewPaymentVerification, type AdminPaymentVerification } from "./admin.api";

type Filter = "pending" | "reconciliation_required" | "approved" | "rejected" | "all";
type Decision = "approved" | "rejected";

export function AdminPaymentVerificationScreen() {
  const user = useCurrentUser();
  const userId = user?.uid ?? null;
  const router = useRouter();
  const cache = useQueryClient();
  const compact = useWindowDimensions().width < 720;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("pending");
  const [selected, setSelected] = useState<AdminPaymentVerification | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const currentActor = () => {
    if (!user || user.uid !== userId) throw new Error("Account changed. Reopen payment verification.");
    return user;
  };
  const query = useQuery({ queryKey: ["admin", "payment-verifications", userId], queryFn: () => getAdminPaymentVerifications(user!), enabled: Boolean(user), staleTime: 15_000, retry: false });
  const action = useMutation({
    mutationFn: async () => {
      if (!selected || !decision) return;
      if (decision === "rejected" && reason.trim().length < 3) throw new Error("Add a rejection reason.");
      return reviewPaymentVerification(currentActor(), selected.id, { status: decision, reason: reason.trim() || `Payment ${decision} after evidence review` });
    },
    onSuccess: async () => {
      setSelected(null); setDecision(null); setReason(""); setFormError(null);
      await Promise.all([cache.invalidateQueries({ queryKey: ["admin", "payment-verifications", userId] }), cache.invalidateQueries({ queryKey: ["admin", "platform", userId] })]);
    },
    onError: (error) => setFormError(error.message)
  });
  const evidence = useMutation({
    mutationFn: async () => {
      if (!selected?.evidence) throw new Error("Evidence is not available.");
      const access = await accessAdminPaymentEvidence(currentActor(), selected.id, selected.evidence.id);
      await Linking.openURL(access.url);
    },
    onError: (error) => setFormError(error.message)
  });
  const rows = query.data ?? [];
  const filtered = useMemo(() => rows.filter((item) => filter === "all" || item.status === filter).filter((item) => `${item.orderNumber} ${item.customer} ${item.transactionRef} ${item.senderMasked ?? ""} ${item.provider}`.toLowerCase().includes(search.trim().toLowerCase())), [filter, rows, search]);
  const pendingMinor = sumMinor(rows.filter((item) => item.status === "pending").map((item) => item.amount.amountMinor));
  const pendingCount = rows.filter((item) => item.status === "pending").length;
  const evidenceReady = rows.filter((item) => item.status === "pending" && item.evidence).length;
  const reconciliationCount = rows.filter((item) => item.status === "reconciliation_required").length;

  return <Screen eyebrow="FINANCE CONTROL" title="Payment verification" description="Match manual payment evidence against order totals and transaction references before approving fulfilment.">
    <View style={[styles.hero, compact && styles.heroCompact]}><View style={styles.heroCopy}><Text style={styles.heroEyebrow}>PAYMENT TRUST DESK</Text><Text style={styles.heroTitle}>{pendingCount} manual payments need verification</Text><Text style={styles.heroText}>{evidenceReady} include secure evidence. Match amount, sender and transaction reference before releasing fulfilment.</Text></View><View style={styles.heroBadge}><Ionicons color={colors.surface} name="shield-checkmark-outline" size={25} /><Text style={styles.heroBadgeValue}>{money(pendingMinor)}</Text><Text style={styles.heroBadgeLabel}>PENDING VALUE</Text></View></View>
    <View style={[styles.metrics, compact && styles.stack]}><Metric icon="time-outline" label="Pending" value={String(pendingCount)} /><Metric icon="warning-outline" label="Reconcile" value={String(reconciliationCount)} /><Metric icon="cash-outline" label="Pending value" value={money(pendingMinor)} /><Metric icon="checkmark-circle-outline" label="Approved" value={String(rows.filter((item) => item.status === "approved").length)} /><Metric icon="close-circle-outline" label="Rejected" value={String(rows.filter((item) => item.status === "rejected").length)} /></View>
    <View style={[styles.toolbar, compact && styles.stack]}><View style={styles.search}><Ionicons color={colors.muted} name="search-outline" size={18} /><TextInput onChangeText={setSearch} placeholder="Search order, customer or transaction..." placeholderTextColor={colors.muted} style={styles.searchInput} value={search} /></View><Pressable onPress={() => query.refetch()} style={styles.outline}><Ionicons color={colors.primary} name="refresh" size={17} /><Text style={styles.outlineText}>Refresh</Text></Pressable></View>
    <View style={styles.filters}>{(["pending", "reconciliation_required", "approved", "rejected", "all"] as Filter[]).map((item) => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}><Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item === "reconciliation_required" ? "RECONCILE" : item.toUpperCase()}</Text></Pressable>)}</View>
    {query.isLoading ? <ActivityIndicator color={colors.primary} /> : null}{query.error ? <ErrorBox message={query.error.message} /> : null}
    {selected ? <View style={styles.detail}>
      <View style={styles.detailHead}><View><Text style={styles.kicker}>EVIDENCE REVIEW</Text><Text style={styles.detailTitle}>{selected.orderNumber}</Text></View><Pressable accessibilityLabel="Close payment verification" onPress={() => setSelected(null)} style={styles.close}><Ionicons color={colors.text} name="close" size={20} /></Pressable></View>
      <View style={styles.grid}><Cell label="Customer" value={selected.customer} /><Cell label="Amount" value={money(selected.amount.amountMinor)} /><Cell label="Provider" value={selected.provider} /><Cell label="Method" value={selected.method} /><Cell label="Transaction" value={selected.transactionRef} /><Cell label="Sender" value={selected.senderMasked || "Not provided"} /><Cell label="Payment status" value={selected.paymentStatus} /><Cell label="Evidence" value={selected.evidence?.name || "No scanned file attached"} /></View>
      {selected.status === "reconciliation_required" ? <View style={styles.reconciliation}><Ionicons color={colors.warning} name="warning-outline" size={20} /><View style={styles.flex}><Text style={styles.reconciliationTitle}>Captured payment needs finance reconciliation</Text><Text style={styles.muted}>The order was already closed or its stock hold expired. Do not release fulfilment. Open the order, verify the gateway transaction, then use the audited refund workflow.</Text></View></View> : null}
      {selected.evidence ? <Pressable disabled={evidence.isPending} onPress={() => evidence.mutate()} style={styles.outline}><Ionicons color={colors.primary} name="eye-outline" size={17} /><Text style={styles.outlineText}>{evidence.isPending ? "Opening..." : `Open evidence (${selected.evidence.mimeType})`}</Text></Pressable> : null}
      <View style={styles.actions}>{selected.status === "pending" ? <><Pressable onPress={() => setDecision("approved")} style={[styles.action, decision === "approved" && styles.actionActive]}><Text style={[styles.actionText, decision === "approved" && styles.activeText]}>Approve</Text></Pressable><Pressable onPress={() => setDecision("rejected")} style={[styles.action, styles.actionDanger]}><Text style={styles.dangerText}>Reject</Text></Pressable></> : null}<Pressable onPress={() => router.push(`/admin/orders/${selected.orderId}` as never)} style={styles.action}><Text style={styles.actionText}>{selected.status === "reconciliation_required" ? "Open refund workspace" : "Open order"}</Text></Pressable></View>
      {decision ? <><TextInput multiline onChangeText={setReason} placeholder={decision === "rejected" ? "Rejection reason (required)" : "Approval note (optional)"} placeholderTextColor={colors.muted} style={styles.note} value={reason} /><Pressable disabled={action.isPending} onPress={() => action.mutate()} style={[styles.primary, decision === "rejected" && styles.dangerPrimary]}>{action.isPending ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryText}>Confirm {decision}</Text>}</Pressable></> : null}
      {formError ? <ErrorBox message={formError} /> : null}
    </View> : null}
    <View style={styles.list}>{filtered.map((item) => <Pressable key={item.id} onPress={() => { setSelected(item); setDecision(null); setReason(""); setFormError(null); }} style={[styles.card, selected?.id === item.id && styles.cardActive]}><View style={styles.icon}><Ionicons color={colors.primary} name="card-outline" size={21} /></View><View style={styles.flex}><Text style={styles.name}>{item.orderNumber} · {item.customer}</Text><Text style={styles.muted}>{item.provider} · {item.transactionRef} · {new Date(item.createdAt).toLocaleDateString("en-BD")}</Text></View><Text style={styles.amount}>{money(item.amount.amountMinor)}</Text><Status value={item.status} /></Pressable>)}</View>
    {!query.isLoading && filtered.length === 0 ? <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons color={colors.accent} name="checkmark-done-outline" size={28} /></View><Text style={styles.emptyTitle}>Verification queue is clear</Text><Text style={styles.muted}>Change the status or search term to review older cases.</Text></View> : null}
  </Screen>;
}

function money(minor: string | bigint) { return formatMinor(minor); }
function Metric({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) { return <View style={styles.metric}><View style={styles.metricIcon}><Ionicons color={colors.accent} name={icon} size={17} /></View><View style={styles.flex}><Text adjustsFontSizeToFit numberOfLines={1} style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View></View>; }
function Cell({ label, value }: { label: string; value: string }) { return <View style={styles.cell}><Text style={styles.cellLabel}>{label}</Text><Text numberOfLines={2} style={styles.cellValue}>{value}</Text></View>; }
function Status({ value }: { value: string }) { return <Text style={[styles.status, value === "approved" && styles.statusGood, value === "rejected" && styles.statusBad, value === "reconciliation_required" && styles.statusReconcile]}>{value === "reconciliation_required" ? "RECONCILE" : value.toUpperCase()}</Text>; }
function ErrorBox({ message }: { message: string }) { return <View style={styles.error}><Ionicons color={colors.danger} name="alert-circle-outline" size={18} /><Text style={styles.errorText}>{message}</Text></View>; }

const styles = StyleSheet.create({
  hero: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", gap: spacing.lg, justifyContent: "space-between", padding: spacing.lg }, heroCompact: { alignItems: "stretch", flexDirection: "column" }, heroCopy: { flex: 1, minWidth: 0 }, heroEyebrow: { color: colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 1.2 }, heroTitle: { color: colors.surface, fontSize: 23, fontWeight: "700", marginTop: 6 }, heroText: { color: colors.background, fontSize: 11, lineHeight: 18, marginTop: 7, opacity: 0.82 }, heroBadge: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, minWidth: 150, padding: spacing.md }, heroBadgeValue: { color: colors.surface, fontSize: 20, fontWeight: "700", marginTop: 5 }, heroBadgeLabel: { color: colors.surface, fontSize: 9, fontWeight: "700", letterSpacing: 0.8 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, stack: { flexDirection: "column" }, metric: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, flex: 1, flexDirection: "row", gap: 10, minWidth: 145, padding: spacing.md }, metricIcon: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.pill, height: 34, justifyContent: "center", width: 34 }, metricValue: { color: colors.text, fontSize: 20, fontWeight: "700" }, metricLabel: { color: colors.muted, fontSize: 10, fontWeight: "600", marginTop: 3, textTransform: "uppercase" },
  toolbar: { alignItems: "center", flexDirection: "row", gap: spacing.md }, search: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, flex: 1, flexDirection: "row", gap: 8, paddingHorizontal: 12 }, searchInput: { color: colors.text, flex: 1, height: 44, outlineStyle: "none" } as never, outline: { alignItems: "center", borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: 6, marginTop: 10, minHeight: 44, paddingHorizontal: 14 }, outlineText: { color: colors.primary, fontSize: 11, fontWeight: "700" },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, filter: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 }, filterActive: { backgroundColor: colors.primary }, filterText: { color: colors.muted, fontSize: 10, fontWeight: "700" }, filterTextActive: { color: colors.surface },
  detail: { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md }, detailHead: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingBottom: 11 }, kicker: { color: colors.primary, fontSize: 9, fontWeight: "700", letterSpacing: 1.2 }, detailTitle: { color: colors.text, fontSize: 20, fontWeight: "700", marginTop: 3 }, close: { alignItems: "center", backgroundColor: colors.background, borderRadius: radius.md, height: 44, justifyContent: "center", width: 44 }, grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12 }, cell: { flex: 1, minWidth: 135 }, cellLabel: { color: colors.muted, fontSize: 9, fontWeight: "700", textTransform: "uppercase" }, cellValue: { color: colors.text, fontSize: 11, fontWeight: "600", marginTop: 3 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }, action: { borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 }, actionActive: { backgroundColor: colors.primary }, actionDanger: { borderColor: colors.danger }, actionText: { color: colors.primary, fontSize: 10, fontWeight: "700" }, activeText: { color: colors.onPrimary }, dangerText: { color: colors.danger, fontSize: 10, fontWeight: "700" }, reconciliation: { alignItems: "flex-start", backgroundColor: colors.accentSoft, borderRadius: radius.md, flexDirection: "row", gap: 10, marginTop: 12, padding: 12 }, reconciliationTitle: { color: colors.text, fontSize: 12, fontWeight: "700" }, note: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, marginTop: 9, minHeight: 68, outlineStyle: "none", padding: 10, textAlignVertical: "top" } as never, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", marginTop: 8, minHeight: 44 }, dangerPrimary: { backgroundColor: colors.danger }, primaryText: { color: colors.onPrimary, fontSize: 11, fontWeight: "700" },
  list: { gap: 10 }, card: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, flexDirection: "row", flexWrap: "wrap", gap: 10, padding: spacing.md, shadowColor: colors.navy, shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.05, shadowRadius: 12 }, cardActive: { borderColor: colors.primary, borderWidth: 1 }, icon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 42, justifyContent: "center", width: 42 }, flex: { flex: 1, minWidth: 180 }, name: { color: colors.text, fontSize: 12, fontWeight: "700" }, muted: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 }, amount: { color: colors.text, fontSize: 12, fontWeight: "700" }, status: { backgroundColor: colors.accentSoft, borderRadius: 12, color: colors.warning, fontSize: 9, fontWeight: "700", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 5 }, statusGood: { color: colors.success }, statusBad: { backgroundColor: colors.primarySoft, color: colors.danger }, statusReconcile: { backgroundColor: colors.accentSoft, color: colors.warning }, error: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: 8, marginTop: 9, padding: 10 }, errorText: { color: colors.danger, flex: 1, fontSize: 10, fontWeight: "700" }, empty: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl }, emptyIcon: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.pill, height: 52, justifyContent: "center", width: 52 }, emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 10 }
});
