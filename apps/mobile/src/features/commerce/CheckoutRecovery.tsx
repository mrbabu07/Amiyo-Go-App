import type { User } from "firebase/auth";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { placeOrder } from "./commerce.api";
import { recoveryWindowMs, type PendingCheckout } from "./pending-checkout";

export function CheckoutRecovery({ user, pending }: { user: User; pending: PendingCheckout }) {
  const router = useRouter();
  const cache = useQueryClient();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expired = Date.now() < pending.createdAt || Date.now() - pending.createdAt >= recoveryWindowMs;
  async function recover() {
    if (lock.current || expired) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      if (firebaseAuth?.currentUser?.uid !== user.uid) throw new Error("Your account changed. Reopen checkout.");
      const result = await placeOrder(user, pending.input, pending.key);
      if (firebaseAuth?.currentUser?.uid !== user.uid) return;
      cache.removeQueries({ queryKey: ["cart", user.uid] });
      cache.removeQueries({ queryKey: ["checkout-recovery", user.uid] });
      router.replace({ pathname: "/order-confirmation", params: { orderId: result.order.id, orderNumber: result.order.orderNumber, totalMinor: result.order.total.amountMinor, payment: result.payment.status, invoice: result.invoiceNumber, actionUrl: result.actionUrl || "", instructions: result.instructions || "" } });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Recovery failed. Please try again."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Screen eyebrow="CHECKOUT RECOVERY" title="Check your previous checkout" description={expired ? "The safe retry window has expired. Check order history and contact support before placing another order." : "Your previous request may already have created an order. Retry its original details safely instead of submitting a new order."}>
    <Pressable accessibilityRole="button" disabled={busy || expired} onPress={() => void recover()} style={[styles.button, (busy || expired) && styles.disabled]}><Text style={styles.label}>{busy ? "Recovering…" : "Retry original checkout"}</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={() => router.push("/orders")} style={styles.button}><Text style={styles.label}>View my orders</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={() => router.push("/support" as never)} style={styles.button}><Text style={styles.label}>Contact support</Text></Pressable>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  button: { minHeight: 44, backgroundColor: colors.primary, padding: spacing.md, borderRadius: 12, marginBottom: spacing.sm, alignItems: "center" },
  label: { color: "#fff", fontWeight: "600" },
  disabled: { opacity: 0.5 },
  error: { color: colors.danger }
});
