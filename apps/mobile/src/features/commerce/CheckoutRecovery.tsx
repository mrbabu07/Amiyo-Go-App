import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "firebase/auth";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { placeOrder } from "./commerce.api";
import { recoveryWindowMs, type PendingCheckout } from "./pending-checkout";

export function CheckoutRecovery({ user, pending }: { user: User; pending: PendingCheckout }) {
  const router = useRouter();
  const cache = useQueryClient();
  const currentUser = useCurrentUser();
  const activeUid = useRef(currentUser?.uid);
  activeUid.current = currentUser?.uid;
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expired = Date.now() < pending.createdAt || Date.now() - pending.createdAt >= recoveryWindowMs;

  async function recover() {
    if (lock.current || expired) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      if (activeUid.current !== user.uid) throw new Error("Your account changed. Reopen checkout.");
      const result = await placeOrder(user, pending.input, pending.key);
      if (activeUid.current !== user.uid) return;
      cache.removeQueries({ queryKey: ["cart", user.uid] });
      cache.removeQueries({ queryKey: ["checkout-recovery", user.uid] });
      router.replace({ pathname: "/order-confirmation", params: { orderId: result.order.id, orderNumber: result.order.orderNumber, totalMinor: result.order.total.amountMinor, payment: result.payment.status, invoice: result.invoiceNumber, actionUrl: result.actionUrl || "", instructions: result.instructions || "" } });
    } catch (caught) {
      if (activeUid.current === user.uid) setError(caught instanceof Error ? caught.message : "Recovery failed. Please try again.");
    } finally {
      lock.current = false;
      if (activeUid.current === user.uid) setBusy(false);
    }
  }

  return <Screen eyebrow="CHECKOUT RECOVERY" title="Check your previous checkout" description={expired ? "The safe retry window has expired. Check order history and contact support before placing another order." : "Your previous request may already have created an order. Retry its original details safely instead of submitting a new order."}>
    <View style={styles.card}>
      <View style={[styles.statusIcon, expired && styles.statusIconExpired]}><Ionicons color={expired ? colors.warning : colors.primary} name={expired ? "time-outline" : "shield-checkmark-outline"} size={30} /></View>
      <View style={styles.copy}><Text accessibilityRole="header" style={styles.title}>{expired ? "Recovery window expired" : "Your checkout details are protected"}</Text><Text style={styles.description}>{expired ? "To avoid a duplicate order, review your order history before starting checkout again." : "We will reuse the original request and idempotency key. Your cart, address and payment choice will not be silently changed."}</Text></View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityState={{ busy, disabled: busy || expired }} disabled={busy || expired} onPress={() => void recover()} style={[styles.primary, (busy || expired) && styles.disabled]}>{busy ? <ActivityIndicator color={colors.surface} /> : <Ionicons color={colors.surface} name="refresh-outline" size={19} />}<Text style={styles.primaryLabel}>{busy ? "Recovering…" : "Retry original checkout"}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push("/orders")} style={styles.secondary}><Ionicons color={colors.primary} name="receipt-outline" size={19} /><Text style={styles.secondaryLabel}>View my orders</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push("/support" as never)} style={styles.ghost}><Ionicons color={colors.navy} name="chatbubble-ellipses-outline" size={19} /><Text style={styles.ghostLabel}>Contact support</Text></Pressable>
      </View>
      {error ? <View accessibilityRole="alert" style={styles.error}><Ionicons color={colors.danger} name="alert-circle-outline" size={20} /><Text style={styles.errorText}>{error}</Text></View> : null}
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  card: { alignSelf: "center", backgroundColor: colors.surface, borderRadius: radius.xl, boxShadow: "0 12px 34px rgba(11,31,58,.10)", gap: spacing.lg, maxWidth: 680, padding: spacing.xl, width: "100%" },
  statusIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 58, justifyContent: "center", width: 58 },
  statusIconExpired: { backgroundColor: colors.accentSoft },
  copy: { gap: spacing.sm },
  title: { color: colors.text, fontSize: 22, fontWeight: "700" },
  description: { color: colors.muted, lineHeight: 21 },
  actions: { gap: spacing.sm },
  primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 50, paddingHorizontal: spacing.lg },
  primaryLabel: { color: colors.surface, fontWeight: "700" },
  secondary: { alignItems: "center", borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 50, paddingHorizontal: spacing.lg },
  secondaryLabel: { color: colors.primary, fontWeight: "700" },
  ghost: { alignItems: "center", borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.lg },
  ghostLabel: { color: colors.navy, fontWeight: "700" },
  disabled: { opacity: 0.5 },
  error: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  errorText: { color: colors.danger, flex: 1, lineHeight: 19 }
});
