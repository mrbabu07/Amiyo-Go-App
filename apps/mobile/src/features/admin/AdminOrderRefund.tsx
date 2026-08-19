import type { AdminOrderDetail } from "@amiyo/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { forceAdminOrderRefund } from "../operations/operations.api";

const money = (minor: bigint) => `৳${(Number(minor) / 100).toLocaleString("en-BD")}`;

export function AdminOrderRefund({ order }: { order: AdminOrderDetail }) {
  const user = firebaseAuth?.currentUser ?? null;
  const cache = useQueryClient();
  const paid = BigInt(order.payment?.amount.amountMinor ?? "0");
  const refunded = BigInt(order.payment?.refunded.amountMinor ?? "0");
  const remaining = paid - refunded;
  const [amount, setAmount] = useState(remaining > 0n ? (Number(remaining) / 100).toFixed(2) : "");
  const [reason, setReason] = useState("");
  const [providerRefundId, setProviderRefundId] = useState(`ADMIN-${order.orderNumber}-${Date.now()}`);
  const amountMinor = useMemo(() => {
    const parsed = Number(amount);
    return Number.isFinite(parsed) && parsed > 0 ? BigInt(Math.round(parsed * 100)) : 0n;
  }, [amount]);
  const valid = Boolean(user && order.payment && amountMinor > 0n && amountMinor <= remaining && reason.trim().length >= 5 && providerRefundId.trim().length >= 2);
  const refund = useMutation({
    mutationFn: () => forceAdminOrderRefund(user!, order.id, { expectedVersion: order.version, amountMinor: amountMinor.toString(), reason: reason.trim(), providerRefundId: providerRefundId.trim() }),
    onSuccess: async () => { setReason(""); await Promise.all([cache.invalidateQueries({ queryKey: ["admin", "order", order.id] }), cache.invalidateQueries({ queryKey: ["admin", "commerce"] })]); }
  });

  if (!order.payment || remaining <= 0n) return null;
  return <ModuleCard title="Force payment refund" meta={`${money(remaining)} remains refundable. This action immediately writes immutable payment, seller-wallet and finance-ledger evidence.`}>
    <View style={styles.warning}><Ionicons color={colors.danger} name="warning-outline" size={20} /><Text style={styles.warningText}>Verify the gateway refund first. This financial action cannot be edited after submission.</Text></View>
    <View style={styles.fields}>
      <View style={styles.field}><Text style={styles.label}>Refund amount (BDT)</Text><TextInput inputMode="decimal" onChangeText={setAmount} placeholder="0.00" placeholderTextColor={colors.muted} style={styles.input} value={amount} /><Text style={styles.help}>Maximum {money(remaining)}</Text></View>
      <View style={styles.field}><Text style={styles.label}>Gateway refund reference</Text><TextInput onChangeText={setProviderRefundId} placeholder="SSL-REFUND-..." placeholderTextColor={colors.muted} style={styles.input} value={providerRefundId} /></View>
    </View>
    <View style={styles.field}><Text style={styles.label}>Reason and approval evidence</Text><TextInput multiline onChangeText={setReason} placeholder="Explain why this refund is authorized" placeholderTextColor={colors.muted} style={[styles.input, styles.reason]} value={reason} /></View>
    {amountMinor > remaining ? <Text style={styles.error}>Refund exceeds the remaining captured payment.</Text> : null}
    {refund.error ? <Text style={styles.error}>{refund.error.message}</Text> : null}
    {refund.data ? <Text style={styles.success}>{refund.data.status.replaceAll("_", " ")} · {money(BigInt(refund.data.amount.amountMinor))} refunded successfully.</Text> : null}
    <Pressable disabled={!valid || refund.isPending} onPress={() => refund.mutate()} style={[styles.button, (!valid || refund.isPending) && styles.disabled]}><Ionicons color="#fff" name="return-down-back-outline" size={18} /><Text style={styles.buttonText}>{refund.isPending ? "Recording refund…" : `Refund ${amountMinor > 0n ? money(amountMinor) : "payment"}`}</Text></Pressable>
  </ModuleCard>;
}

const styles = StyleSheet.create({ fields: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, field: { flex: 1, gap: 6, minWidth: 220 }, label: { color: colors.text, fontSize: 10, fontWeight: "700", textTransform: "uppercase" }, input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 44, paddingHorizontal: spacing.md }, reason: { minHeight: 82, paddingVertical: spacing.sm, textAlignVertical: "top" }, help: { color: colors.muted, fontSize: 10 }, warning: { alignItems: "flex-start", backgroundColor: "#fef2f2", borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.md }, warningText: { color: colors.danger, flex: 1, fontSize: 11, fontWeight: "600", lineHeight: 17 }, button: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.danger, borderRadius: radius.md, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.lg }, buttonText: { color: "#fff", fontWeight: "700" }, disabled: { opacity: .45 }, error: { color: colors.danger, fontSize: 11, fontWeight: "600" }, success: { color: colors.success, fontSize: 11, fontWeight: "600" } });
