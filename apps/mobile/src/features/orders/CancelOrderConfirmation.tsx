import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { colors, radius, spacing } from "../../ui/tokens";

export function CancelOrderConfirmation({ busy, eligible, onClose, onConfirm }: { busy: boolean; eligible: boolean; onClose(): void; onConfirm(reason: string): void }) {
  const [reason, setReason] = useState("");
  const disabled = busy || !eligible || reason.trim().length < 3;
  return <ModuleCard title="Cancel this order?" meta="This cancels all seller packages in this order. Any refund follows the payment refund process.">
    <View style={styles.content}>
      <Text style={styles.label}>Cancellation reason</Text>
      <TextInput accessibilityLabel="Cancellation reason" editable={!busy} multiline maxLength={500} value={reason} onChangeText={setReason} placeholder="Why do you want to cancel?" placeholderTextColor={colors.muted} style={styles.input} />
      {!eligible ? <Text accessibilityRole="alert" style={styles.error}>Cancellation is no longer available. Refresh the order status.</Text> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={() => { if (!disabled) onConfirm(reason.trim()); }} style={[styles.confirm, disabled && styles.disabled]}><Text style={styles.confirmText}>{busy ? "Cancelling..." : "Confirm cancellation"}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onClose} style={styles.keep}><Text style={styles.label}>Keep order</Text></Pressable>
    </View>
  </ModuleCard>;
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  label: { color: colors.text },
  input: { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, minHeight: 80, padding: spacing.md },
  error: { color: colors.danger },
  confirm: { backgroundColor: colors.danger, padding: spacing.md, borderRadius: radius.md, minHeight: 44, alignItems: "center" },
  confirmText: { color: "#fff", fontWeight: "600" },
  keep: { padding: spacing.md, minHeight: 44, alignItems: "center" },
  disabled: { opacity: 0.5 }
});
