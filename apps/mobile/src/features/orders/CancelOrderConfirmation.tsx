import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { colors, radius, spacing } from "../../ui/tokens";
import type { CancellationReasonCode } from "@amiyo/contracts";

const reasons: Array<{ code: Exclude<CancellationReasonCode, "ADMIN_OVERRIDE">; label: string }> = [
  { code: "CHANGED_MIND", label: "Changed my mind" }, { code: "ORDERED_BY_MISTAKE", label: "Ordered by mistake" },
  { code: "WRONG_ADDRESS", label: "Wrong delivery address" }, { code: "PAYMENT_ISSUE", label: "Payment issue" },
  { code: "DUPLICATE_ORDER", label: "Duplicate order" }, { code: "OTHER", label: "Other reason" }
];

export function CancelOrderConfirmation({ busy, eligible, onClose, onConfirm }: { busy: boolean; eligible: boolean; onClose(): void; onConfirm(input: { reasonCode: Exclude<CancellationReasonCode, "ADMIN_OVERRIDE">; reason: string }): void }) {
  const [reasonCode, setReasonCode] = useState<Exclude<CancellationReasonCode, "ADMIN_OVERRIDE"> | null>(null);
  const [reason, setReason] = useState("");
  const disabled = busy || !eligible || !reasonCode || reason.trim().length < 3;
  return <ModuleCard title="Cancel this order?" meta="This cancels all seller packages in this order. Any refund follows the payment refund process.">
    <View style={styles.content}>
      <Text style={styles.label}>Cancellation reason</Text>
      <View style={styles.reasons}>{reasons.map((item) => <Pressable accessibilityRole="button" key={item.code} onPress={() => { setReasonCode(item.code); if (item.code !== "OTHER") setReason(item.label); }} style={[styles.reasonChip, reasonCode === item.code && styles.reasonChipActive]}><Text style={[styles.reasonChipText, reasonCode === item.code && styles.reasonChipTextActive]}>{item.label}</Text></Pressable>)}</View>
      <TextInput accessibilityLabel="Cancellation reason" editable={!busy} multiline maxLength={500} value={reason} onChangeText={setReason} placeholder="Why do you want to cancel?" placeholderTextColor={colors.muted} style={styles.input} />
      {!eligible ? <Text accessibilityRole="alert" style={styles.error}>Cancellation is no longer available. Refresh the order status.</Text> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={() => { if (!disabled && reasonCode) onConfirm({ reasonCode, reason: reason.trim() }); }} style={[styles.confirm, disabled && styles.disabled]}><Text style={styles.confirmText}>{busy ? "Cancelling..." : "Confirm cancellation"}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onClose} style={styles.keep}><Text style={styles.label}>Keep order</Text></Pressable>
    </View>
  </ModuleCard>;
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  label: { color: colors.text },
  reasons: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  reasonChip: { borderRadius: radius.pill, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  reasonChipActive: { backgroundColor: colors.primary },
  reasonChipText: { color: colors.text, fontWeight: "500" },
  reasonChipTextActive: { color: colors.onPrimary },
  input: { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, minHeight: 80, padding: spacing.md },
  error: { color: colors.danger },
  confirm: { backgroundColor: colors.danger, padding: spacing.md, borderRadius: radius.md, minHeight: 44, alignItems: "center" },
  confirmText: { color: colors.onPrimary, fontWeight: "600" },
  keep: { padding: spacing.md, minHeight: 44, alignItems: "center" },
  disabled: { opacity: 0.5 }
});
