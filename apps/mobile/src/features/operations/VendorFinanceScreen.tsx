import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { usePathname, useRouter } from "expo-router";
import type { User } from "firebase/auth";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getVendorWorkspace } from "../vendor/vendor.api";
import { getVendorFinance, requestVendorPayout } from "./operations.api";
import { VendorStatementExport } from "./VendorStatementExport";
import { payoutAmountMinor, selectPayoutBank } from "./vendor-payout-input";
import { createVendorPayoutAttempt } from "./vendor-payout-attempt";

const money = (minor: string | number) => `৳${(Number(minor) / 100).toLocaleString("en-BD")}`;
const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const tabs = [
  ["Overview", "/vendor/finance", "wallet-outline"], ["Reconciliation", "/vendor/finance/reconciliation", "calculator-outline"], ["Payouts", "/vendor/finance/payouts", "cash-outline"], ["Transactions", "/vendor/finance/transactions", "swap-horizontal-outline"], ["Statements", "/vendor/finance/statements", "document-text-outline"], ["Commissions", "/vendor/finance/commissions", "pie-chart-outline"]
] as const;

function payoutPresentation(status: string) {
  if (status === "PAID") return { pill: payoutStyles.successPill, text: payoutStyles.successText };
  if (["REJECTED", "FAILED", "CANCELLED"].includes(status)) return { pill: payoutStyles.dangerPill, text: payoutStyles.dangerText };
  if (["APPROVED", "PROCESSING"].includes(status)) return { pill: payoutStyles.processingPill, text: payoutStyles.processingText };
  return { pill: payoutStyles.pendingPill, text: payoutStyles.pendingText };
}

export function VendorFinanceScreen() {
  const user = useCurrentUser();
  if (!user) return <Screen eyebrow="SELLER FINANCE" title="Sign in to seller finance" description="Sign in with your seller account to view earnings and request payouts." />;
  return <VendorFinanceWorkspace key={user.uid} user={user} />;
}

function VendorFinanceWorkspace({ user }: { user: User }) {
  const router = useRouter();
  const compact = useWindowDimensions().width < 620;
  const pathname = usePathname();
  const activeUid = useRef(user?.uid); activeUid.current = user?.uid;
  const payoutAttempt = useRef(createVendorPayoutAttempt(Crypto.randomUUID)).current;
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ["vendor-finance", user?.uid], queryFn: () => getVendorFinance(user!), enabled: Boolean(user) });
  const workspace = useQuery({ queryKey: ["vendor", "workspace", user?.uid], queryFn: () => getVendorWorkspace(user!), enabled: Boolean(user) });
  const [amount, setAmount] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const selectedBank = selectPayoutBank(workspace.data?.bankAccounts ?? [], bankAccountId);
  const payout = useMutation({ retry: false, mutationFn: async () => {
    const ownerUid = user.uid;
    const amountMinor = payoutAmountMinor(amount, query.data?.balance.amountMinor ?? "0");
    if (activeUid.current !== ownerUid || !selectedBank || !amountMinor || workspace.isFetching || workspace.error) throw new Error("Check your payout amount and destination before submitting.");
    const identity = `${ownerUid}:${selectedBank}:${amountMinor}`;
    const result = await payoutAttempt.submit(identity, (idempotencyKey) => requestVendorPayout(user, { bankAccountId: selectedBank, amountMinor }, idempotencyKey));
    return { identity, ownerUid, result };
  }, onSuccess: ({ identity, ownerUid }) => { if (activeUid.current !== ownerUid) return; payoutAttempt.reset(identity); setAmount(""); void cache.invalidateQueries({ queryKey: ["vendor-finance", ownerUid] }); } });

  if (query.isLoading) return <Screen eyebrow="SELLER FINANCE" title="Loading finance" description="Calculating your current ledger balance."><View style={styles.empty}><ActivityIndicator color={colors.primary} /></View></Screen>;
  if (query.error || !query.data) return <Screen eyebrow="SELLER FINANCE" title="Finance unavailable" description={query.error instanceof Error ? query.error.message : "Sign in with a vendor account to continue."}><View style={styles.empty}><Ionicons color={colors.primary} name="alert-circle-outline" size={48} /></View></Screen>;

  const credits = query.data.entries.filter((entry) => entry.direction === "CREDIT").reduce((sum, entry) => sum + Number(entry.amount.amountMinor), 0);
  const debits = query.data.entries.filter((entry) => entry.direction === "DEBIT").reduce((sum, entry) => sum + Number(entry.amount.amountMinor), 0);
  const pendingPayout = query.data.payoutRequests.filter((item) => !["PAID", "REJECTED", "FAILED", "CANCELLED"].includes(item.status)).reduce((sum, item) => sum + Number(item.amount.amountMinor), 0);
  const available = Number(query.data.balance.amountMinor);
  const validAmount = Boolean(payoutAmountMinor(amount, query.data.balance.amountMinor) && selectedBank && !workspace.isFetching && !workspace.error);
  const activeTab = tabs.filter((tab) => pathname === tab[1]).at(-1)?.[0] ?? "Overview";
  const entries = query.data.entries.slice().sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return <Screen eyebrow="SELLER FINANCE" title="Finance center" description="Earnings, settlements, payout requests, statements and commission records.">
    <View style={styles.tabs}>{tabs.map(([tabLabel, href, icon]) => { const active = tabLabel === activeTab; return <Pressable key={href} onPress={() => router.push(href)} style={[styles.tab, active && styles.tabActive]}><Ionicons color={active ? colors.surface : colors.muted} name={icon} size={17} /><Text style={[styles.tabText, active && styles.tabTextActive]}>{tabLabel}</Text></Pressable>; })}</View>
    <View style={[styles.hero, compact && styles.heroCompact]}><View style={styles.flex}><Text style={styles.kicker}>AVAILABLE FOR PAYOUT</Text><Text accessibilityRole="header" adjustsFontSizeToFit numberOfLines={1} style={styles.balance}>{money(query.data.balance.amountMinor)}</Text><Text style={styles.heroCopy}>Derived from the append-only seller ledger after reservations.</Text></View><View style={styles.wallet}><Ionicons color={colors.surface} name="wallet" size={30} /></View></View>
    <View style={styles.stats}><Stat icon="trending-up-outline" label="Ledger credits" value={money(credits)} tone="success" /><Stat icon="trending-down-outline" label="Deductions" value={money(debits)} tone="danger" /><Stat icon="time-outline" label="Reserved payouts" value={money(pendingPayout)} /><Stat icon="receipt-outline" label="Ledger entries" value={String(query.data.entries.length)} /></View>
    <View style={styles.columns}><View style={[styles.main, compact && styles.columnCompact]}><View style={styles.section}><View><Text style={styles.heading}>Recent transactions</Text><Text style={styles.muted}>Every sale, commission, refund and payout movement</Text></View><VendorStatementExport key={`${user!.uid}:${query.data.vendorId}`} user={user!} vendorId={query.data.vendorId} /></View>{entries.length ? <View style={styles.panel}>{entries.slice(0, activeTab === "Transactions" ? 100 : 12).map((entry) => { const credit = entry.direction === "CREDIT"; return <View key={entry.id} style={styles.row}><View style={[styles.entryIcon, !credit && styles.debitIcon]}><Ionicons color={credit ? colors.success : colors.danger} name={credit ? "arrow-down" : "arrow-up"} size={18} /></View><View style={styles.flex}><Text style={styles.entryTitle}>{label(entry.entryType)}</Text><Text style={styles.muted}>{new Date(entry.createdAt).toLocaleString("en-BD")} · {label(entry.referenceType)}</Text></View><Text style={[styles.amount, !credit && styles.debit]}>{credit ? "+" : "-"}{money(entry.amount.amountMinor)}</Text></View>; })}</View> : <View style={styles.empty}><Ionicons color={colors.muted} name="receipt-outline" size={34} /><Text style={styles.entryTitle}>No ledger activity yet</Text></View>}</View><View style={[styles.side, compact && styles.columnCompact]}><Text style={styles.heading}>Request payout</Text><View style={styles.payoutCard}><Text style={styles.label}>Payout destination</Text>{workspace.data?.bankAccounts.length ? <View style={styles.accounts}>{workspace.data.bankAccounts.map((account) => { const active = selectedBank === account.id; return <Pressable key={account.id} onPress={() => setBankAccountId(account.id)} style={[styles.account, active && styles.accountActive]}><Ionicons color={active ? colors.primary : colors.muted} name={active ? "radio-button-on" : "radio-button-off"} size={19} /><View style={styles.flex}><Text style={styles.accountName}>{account.provider} · {account.accountNumberMasked}</Text><Text style={styles.muted}>{account.accountName}{account.isDefault ? " · Default" : ""}</Text></View></Pressable>; })}</View> : <Pressable onPress={() => router.push("/vendor/payout-settings")} style={styles.setup}><Text style={styles.setupText}>Add bank or MFS account →</Text></Pressable>}<Text style={styles.label}>Amount (BDT)</Text><TextInput accessibilityLabel="Payout amount in BDT" keyboardType="decimal-pad" editable={!payout.isPending} maxLength={20} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={colors.muted} style={styles.input} value={amount} /><View style={styles.availableRow}><Text style={styles.muted}>Available</Text><Pressable onPress={() => setAmount(String(Math.max(0, available) / 100))}><Text style={styles.useAll}>Use {money(Math.max(0, available))}</Text></Pressable></View><Pressable disabled={!validAmount || payout.isPending} onPress={() => payout.mutate()} style={[styles.primary, (!validAmount || payout.isPending) && styles.disabled]}>{payout.isPending ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>Submit payout request</Text>}</Pressable>{payout.isSuccess ? <Text style={styles.success}>Payout request submitted for finance review.</Text> : null}{payout.error ? <Text style={styles.error}>{payout.error.message}</Text> : null}</View><Text style={styles.heading}>Payout history</Text><View style={styles.panel}>{query.data.payoutRequests.slice(0, 10).map((item) => { const presentation = payoutPresentation(item.status); return <View key={item.id} style={styles.payoutRow}><View><Text style={styles.entryTitle}>{money(item.amount.amountMinor)}</Text><Text style={styles.muted}>{new Date(item.requestedAt).toLocaleDateString("en-BD")}</Text></View><Text style={[styles.status, presentation.pill, presentation.text]}>{label(item.status)}</Text></View>; })}{!query.data.payoutRequests.length ? <View style={styles.emptySmall}><Text style={styles.muted}>No payout requests yet.</Text></View> : null}</View></View></View>
  </Screen>;
}

function Stat({ icon, label: statLabel, tone, value }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; tone?: "success" | "danger"; value: string }) { return <View style={styles.stat}><View style={styles.statTop}><Ionicons color={tone === "success" ? colors.success : tone === "danger" ? colors.danger : colors.primary} name={icon} size={19} /><Text style={styles.statLabel}>{statLabel}</Text></View><Text style={styles.statValue}>{value}</Text></View>; }

const payoutStyles = StyleSheet.create({
  pendingPill: { backgroundColor: "#FFF4D6" }, pendingText: { color: colors.warning },
  processingPill: { backgroundColor: colors.primarySoft }, processingText: { color: colors.primary },
  successPill: { backgroundColor: colors.accentSoft }, successText: { color: colors.success },
  dangerPill: { backgroundColor: "#FCE8E6" }, dangerText: { color: colors.danger }
});

const styles = StyleSheet.create({
  heroCompact: { gap: spacing.sm, padding: spacing.lg },
  flex: { flex: 1, minWidth: 0 }, tabs: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, tab: { alignItems: "center", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: 6, minHeight: 40, paddingHorizontal: 12 }, tabActive: { backgroundColor: colors.primary, borderColor: colors.primary }, tabText: { color: colors.muted, fontSize: 10, fontWeight: "700" }, tabTextActive: { color: colors.surface }, hero: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", gap: spacing.lg, justifyContent: "space-between", padding: spacing.xl }, kicker: { color: "#D9E6A7", fontSize: 10, fontWeight: "700", letterSpacing: 1.2 }, balance: { color: colors.surface, fontSize: 38, fontWeight: "700", marginTop: 5 }, heroCopy: { color: "rgba(250,247,240,.74)", fontSize: 11, marginTop: 4 }, wallet: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, height: 58, justifyContent: "center", width: 58 }, stats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, stat: { backgroundColor: colors.surface, borderRadius: radius.lg, boxShadow: "0 7px 22px rgba(11,31,58,.06)", flexGrow: 1, minWidth: 170, padding: spacing.md }, statTop: { alignItems: "center", flexDirection: "row", gap: 7 }, statValue: { color: colors.text, fontSize: 20, fontWeight: "700", marginTop: spacing.md }, statLabel: { color: colors.muted, fontSize: 10, fontWeight: "600" }, columns: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.lg }, main: { flex: 1.6, gap: spacing.md, minWidth: 300 }, side: { flex: 1, gap: spacing.md, minWidth: 280 }, columnCompact: { minWidth: 0, width: "100%" }, section: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" }, heading: { color: colors.text, fontSize: 18, fontWeight: "700" }, panel: { backgroundColor: colors.surface, borderRadius: radius.lg, boxShadow: "0 7px 22px rgba(11,31,58,.06)", overflow: "hidden" }, row: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md }, entryIcon: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.pill, height: 40, justifyContent: "center", width: 40 }, debitIcon: { backgroundColor: "#FCE8E6" }, entryTitle: { color: colors.text, fontSize: 12, fontWeight: "700" }, muted: { color: colors.muted, fontSize: 9, lineHeight: 15, marginTop: 3 }, amount: { color: colors.success, fontSize: 14, fontWeight: "700" }, debit: { color: colors.danger }, payoutCard: { backgroundColor: colors.surface, borderRadius: radius.lg, boxShadow: "0 7px 22px rgba(11,31,58,.06)", gap: spacing.sm, padding: spacing.md }, label: { color: colors.text, fontSize: 11, fontWeight: "700", marginTop: 4 }, accounts: { gap: 6 }, account: { alignItems: "center", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, padding: spacing.sm }, accountActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary }, accountName: { color: colors.text, fontSize: 11, fontWeight: "700" }, setup: { backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: spacing.md }, setupText: { color: colors.accent, fontSize: 11, fontWeight: "700" }, input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, fontSize: 19, fontWeight: "700", minHeight: 48, paddingHorizontal: 13 }, availableRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, useAll: { color: colors.primary, fontSize: 10, fontWeight: "700" }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 46 }, primaryText: { color: colors.surface, fontWeight: "700" }, disabled: { opacity: .45 }, success: { color: colors.success, fontSize: 10, fontWeight: "600" }, error: { color: colors.danger, fontSize: 10 }, payoutRow: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: spacing.md }, status: { borderRadius: radius.pill, fontSize: 8, fontWeight: "700", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 5 }, empty: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.xl, gap: spacing.md, padding: 40 }, emptySmall: { alignItems: "center", padding: spacing.lg }
});
