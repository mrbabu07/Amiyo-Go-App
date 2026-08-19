import type { CheckoutQuote } from "@amiyo/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing } from "../../../ui/tokens";

const money = (minor: string) => `৳${(Number(minor) / 100).toLocaleString("en-BD")}`;

export function CouponInput({ appliedQuote, busy, onApply, onRemove }: { appliedQuote?: CheckoutQuote | null; busy?: boolean; onApply(code: string): Promise<void>; onRemove(): void }) {
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
  if (applied && appliedQuote) return <View style={styles.applied}><View style={styles.appliedIcon}><Ionicons color={colors.success} name="checkmark-circle" size={25} /></View><View style={styles.copy}><Text style={styles.appliedTitle}>Coupon Applied: {applied.code}</Text><Text style={styles.saved}>You saved {money(appliedQuote.discount.amountMinor)}!</Text><Text style={styles.note}>Only one coupon or voucher can be used per order.</Text></View><Pressable accessibilityRole="button" onPress={onRemove}><Text style={styles.remove}>Remove</Text></Pressable></View>;
  return <View style={styles.container}><Text style={styles.label}>Coupon or voucher code</Text><View style={styles.row}><View style={styles.inputWrap}><Ionicons color={colors.muted} name="ticket-outline" size={19} /><TextInput accessibilityLabel="Coupon code" autoCapitalize="characters" editable={!busy} onChangeText={(value) => setCode(value.toUpperCase())} onSubmitEditing={() => void apply()} placeholder="Enter coupon code" placeholderTextColor="#94a3b8" style={styles.input} value={code} /></View><Pressable disabled={busy || !code.trim()} onPress={() => void apply()} style={[styles.button, (busy || !code.trim()) && styles.disabled]}>{busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>Apply</Text>}</Pressable></View>{error ? <Text style={styles.error}>{error}</Text> : null}</View>;
}

const styles = StyleSheet.create({ container: { gap: spacing.sm }, label: { color: colors.text, fontSize: 13, fontWeight: "600" }, row: { flexDirection: "row", gap: spacing.sm }, inputWrap: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, flexDirection: "row", paddingHorizontal: 12 }, input: { color: colors.text, flex: 1, minHeight: 44, paddingHorizontal: spacing.sm }, button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minWidth: 78, paddingHorizontal: spacing.md }, buttonText: { color: colors.surface, fontWeight: "700" }, disabled: { opacity: 0.55 }, error: { color: colors.danger, fontSize: 12 }, applied: { alignItems: "flex-start", backgroundColor: "#ecfdf5", borderColor: "#a7f3d0", borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, padding: spacing.md }, appliedIcon: { paddingTop: 1 }, copy: { flex: 1 }, appliedTitle: { color: "#166534", fontWeight: "700" }, saved: { color: colors.success, fontSize: 12, fontWeight: "600", marginTop: 3 }, note: { color: "#15803d", fontSize: 10, marginTop: 3 }, remove: { color: colors.danger, fontSize: 12, fontWeight: "700" } });
