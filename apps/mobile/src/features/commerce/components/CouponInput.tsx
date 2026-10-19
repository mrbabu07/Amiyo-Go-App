import type { CheckoutQuote } from "@amiyo/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { colors, radius, spacing } from "../../../ui/tokens";
import { formatMinor } from "../../../ui/money";

const money = (minor: string) => formatMinor(minor);

export function CouponInput({ appliedQuote, busy, onApply, onRemove }: { appliedQuote?: CheckoutQuote | null; busy?: boolean; onApply(code: string): Promise<void>; onRemove(): void }) {
  const compact = useWindowDimensions().width < 480;
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const applied = appliedQuote?.coupon;

  async function apply() {
    const normalized = code.trim().toUpperCase();
    if (!normalized) { setError("Please enter a coupon code"); return; }
    setError(null);
    try { await onApply(normalized); setCode(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Coupon could not be applied"); }
  }

  if (applied && appliedQuote) {
    return (
      <View style={[styles.applied, compact && styles.appliedCompact]}>
        <View style={styles.appliedIcon}><Ionicons color={colors.success} name="checkmark-circle" size={25} /></View>
        <View style={styles.copy}>
          <Text style={styles.appliedTitle}>Coupon Applied: {applied.code}</Text>
          <Text style={styles.saved}>You saved {money(appliedQuote.discount.amountMinor)}!</Text>
          <Text style={styles.note}>Only one coupon or voucher can be used per order.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onRemove} style={[styles.removeButton, compact && styles.removeButtonCompact]}><Text style={styles.remove}>Remove</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Coupon or voucher code</Text>
      <View style={[styles.row, compact && styles.rowCompact]}>
        <View style={styles.inputWrap}>
          <Ionicons color={colors.muted} name="ticket-outline" size={19} />
          <TextInput accessibilityLabel="Coupon code" autoCapitalize="characters" editable={!busy} onChangeText={(value) => setCode(value.toUpperCase())} onSubmitEditing={() => void apply()} placeholder="Enter coupon code" placeholderTextColor={colors.muted} returnKeyType="done" style={styles.input} value={code} />
        </View>
        <Pressable accessibilityRole="button" disabled={busy || !code.trim()} onPress={() => void apply()} style={[styles.button, compact && styles.buttonCompact, (busy || !code.trim()) && styles.disabled]}>{busy ? <ActivityIndicator color={colors.surface} size="small" /> : <Text style={styles.buttonText}>Apply</Text>}</Pressable>
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  label: { color: colors.text, fontSize: 13, fontWeight: "600" },
  row: { flexDirection: "row", gap: spacing.sm },
  rowCompact: { flexDirection: "column" },
  inputWrap: { alignItems: "center", backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, flexDirection: "row", paddingHorizontal: 12 },
  input: { color: colors.text, flex: 1, minHeight: 46, minWidth: 0, paddingHorizontal: spacing.sm },
  button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 46, minWidth: 78, paddingHorizontal: spacing.md },
  buttonCompact: { width: "100%" },
  buttonText: { color: colors.surface, fontWeight: "700" },
  disabled: { opacity: 0.55 },
  error: { color: colors.danger, fontSize: 12 },
  applied: { alignItems: "flex-start", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  appliedCompact: { flexWrap: "wrap" },
  appliedIcon: { paddingTop: 1 },
  copy: { flex: 1, minWidth: 150 },
  appliedTitle: { color: colors.text, fontWeight: "700" },
  saved: { color: colors.success, fontSize: 12, fontWeight: "600", marginTop: 3 },
  note: { color: colors.muted, fontSize: 10, marginTop: 3 },
  removeButton: { alignItems: "center", justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.sm },
  removeButtonCompact: { backgroundColor: colors.surface, borderRadius: radius.sm, width: "100%" },
  remove: { color: colors.danger, fontSize: 12, fontWeight: "700" }
});
