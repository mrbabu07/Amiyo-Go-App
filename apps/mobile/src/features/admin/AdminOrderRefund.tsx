import type { AdminOrderDetail } from "@amiyo/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { formatMinor, minorToMajorInput, parseMajorToMinor } from "../../ui/money";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { forceAdminOrderRefund } from "../operations/operations.api";
import { getPlatformSettings } from "./admin.api";

const money = (minor: bigint) => formatMinor(minor);

export function AdminOrderRefund({ order }: { order: AdminOrderDetail }) {
  const user = useCurrentUser();
  const userId = user?.uid ?? null;
  const cache = useQueryClient();
  const settings = useQuery({ queryKey: ["admin", "settings", userId], queryFn: () => getPlatformSettings(user!), enabled: Boolean(user), staleTime: 15_000, retry: false });
  const paid = BigInt(order.payment?.amount.amountMinor ?? "0");
  const refunded = BigInt(order.payment?.refunded.amountMinor ?? "0");
  const remaining = paid - refunded;
  const [amount, setAmount] = useState(remaining > 0n ? minorToMajorInput(remaining) : "");
  const [reason, setReason] = useState("");
  const [providerRefundId, setProviderRefundId] = useState(`ADMIN-${order.orderNumber}-${Date.now()}`);
  const amountMinor = useMemo(() => parseMajorToMinor(amount) ?? 0n, [amount]);
  const policy = settings.data?.businessRules.refunds;
  const amountAllowed = Boolean(policy && amountMinor > 0n && amountMinor <= remaining && (policy.allowPartial || amountMinor === remaining));
  const referenceAllowed = Boolean(policy && (!policy.requireProviderReference || providerRefundId.trim().length >= 2));
  const valid = Boolean(user && order.payment && amountAllowed && referenceAllowed && reason.trim().length >= 5);
  const currentActor = () => { if (!user || user.uid !== userId) throw new Error("Account changed. Reopen refund controls."); return user; };
  const refund = useMutation({
    mutationFn: () => forceAdminOrderRefund(currentActor(), order.id, { expectedVersion: order.version, amountMinor: amountMinor.toString(), reason: reason.trim(), providerRefundId: providerRefundId.trim() || null }),
    onSuccess: async () => { setReason(""); await Promise.all([cache.invalidateQueries({ queryKey: ["admin", "order", userId, order.id] }), cache.invalidateQueries({ queryKey: ["admin", "commerce", userId] })]); }
  });

  if (!order.payment || remaining <= 0n) return null;
  return <ModuleCard title="Force payment refund" meta={`${money(remaining)} remains refundable. This action immediately writes immutable payment, seller-wallet and finance-ledger evidence.`}>
    <View style={styles.warning}><Ionicons color={colors.danger} name="warning-outline" size={20} /><Text style={styles.warningText}>Verify the gateway refund first. This financial action cannot be edited after submission.</Text></View>
    {policy ? <View style={styles.policy}><Ionicons color={colors.primary} name="shield-checkmark-outline" size={18} /><Text style={styles.policyText}>{policy.allowPartial ? "Full or partial refunds are enabled." : "Policy requires the full remaining amount."} {policy.requireProviderReference ? "A provider reference is required." : "Provider reference is optional."}</Text></View> : <Text accessibilityRole="alert" style={styles.error}>{settings.isLoading ? "Loading refund policy…" : "Refund policy is unavailable. Refresh settings before continuing."}</Text>}
    <View style={styles.fields}>
      <View style={styles.field}><Text style={styles.label}>Refund amount (BDT)</Text><TextInput inputMode="decimal" onChangeText={setAmount} placeholder="0.00" placeholderTextColor={colors.muted} style={styles.input} value={amount} /><Text style={styles.help}>Maximum {money(remaining)}</Text></View>
      <View style={styles.field}><Text style={styles.label}>Gateway refund reference{policy?.requireProviderReference ? " *" : " (optional)"}</Text><TextInput onChangeText={setProviderRefundId} placeholder="SSL-REFUND-..." placeholderTextColor={colors.muted} style={styles.input} value={providerRefundId} /></View>
    </View>
    <View style={styles.field}><Text style={styles.label}>Reason and approval evidence</Text><TextInput multiline onChangeText={setReason} placeholder="Explain why this refund is authorized" placeholderTextColor={colors.muted} style={[styles.input, styles.reason]} value={reason} /></View>
    {amountMinor > remaining ? <Text style={styles.error}>Refund exceeds the remaining captured payment.</Text> : null}
    {policy && !policy.allowPartial && amountMinor > 0n && amountMinor !== remaining ? <Text accessibilityRole="alert" style={styles.error}>Current policy requires refunding the full remaining {money(remaining)}.</Text> : null}
    {refund.error ? <Text style={styles.error}>{refund.error.message}</Text> : null}
    {refund.data ? <Text style={styles.success}>{refund.data.status.replaceAll("_", " ")} · {money(BigInt(refund.data.amount.amountMinor))} refunded successfully.</Text> : null}
    <Pressable disabled={!valid || refund.isPending} onPress={() => refund.mutate()} style={[styles.button, (!valid || refund.isPending) && styles.disabled]}><Ionicons color={colors.onPrimary} name="return-down-back-outline" size={18} /><Text style={styles.buttonText}>{refund.isPending ? "Recording refund…" : `Refund ${amountMinor > 0n ? money(amountMinor) : "payment"}`}</Text></Pressable>
  </ModuleCard>;
}

const styles = StyleSheet.create({ fields: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, field: { flex: 1, gap: 6, minWidth: 220 }, label: { color: colors.text, fontSize: 10, fontWeight: "700", textTransform: "uppercase" }, input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 44, paddingHorizontal: spacing.md }, reason: { minHeight: 82, paddingVertical: spacing.sm, textAlignVertical: "top" }, help: { color: colors.muted, fontSize: 10 }, warning: { alignItems: "flex-start", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.md }, warningText: { color: colors.danger, flex: 1, fontSize: 11, fontWeight: "600", lineHeight: 17 }, policy: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.md }, policyText: { color: colors.text, flex: 1, fontSize: 11, lineHeight: 17 }, button: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.danger, borderRadius: radius.md, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.lg }, buttonText: { color: colors.onPrimary, fontWeight: "700" }, disabled: { opacity: .45 }, error: { color: colors.danger, fontSize: 11, fontWeight: "600" }, success: { color: colors.success, fontSize: 11, fontWeight: "600" } });
