import { useQuery } from "@tanstack/react-query";
import type { User } from "@firebase/auth";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { getCustomerOrder } from "../orders/orders.api";
import { orderSupportDraft, validOrderContext } from "./order-support-draft";

export function OrderSupportContext({ user, orderId, onApply }: { user: User; orderId: string; onApply(draft: ReturnType<typeof orderSupportDraft>): void }) {
  const valid = validOrderContext(orderId);
  const query = useQuery({ queryKey: ["support-order-context", user.uid, orderId], queryFn: () => getCustomerOrder(user, orderId), enabled: valid, retry: false });
  return <View style={styles.panel}>
    <Text accessibilityRole="header" style={styles.title}>Order support</Text>
    {!valid ? <Text accessibilityRole="alert" style={styles.error}>Invalid order reference. Open support from your order details.</Text> : query.isLoading ? <ActivityIndicator color={colors.primary} /> : query.error ? <><Text accessibilityRole="alert" style={styles.error}>Could not verify this order in your account.</Text><Pressable accessibilityRole="button" onPress={() => void query.refetch()} style={styles.button}><Text style={styles.buttonText}>Retry order lookup</Text></Pressable></> : query.data ? <>
      <Text style={styles.copy}>{query.data.orderNumber} · {query.data.status.replaceAll("_", " ")}</Text>
      <Text style={styles.copy}>Use the verified order details to prepare this ticket. Add your issue before submitting; no ticket is sent automatically.</Text>
      <Pressable accessibilityRole="button" onPress={() => onApply(orderSupportDraft(query.data!))} style={styles.button}><Text style={styles.buttonText}>Use order details</Text></Pressable>
    </> : null}
  </View>;
}

const styles = StyleSheet.create({
  panel: { padding: spacing.md, gap: spacing.sm, backgroundColor: colors.primarySoft, borderRadius: radius.md },
  title: { color: colors.text, fontSize: 17, fontWeight: "600" },
  copy: { color: colors.text, lineHeight: 21 },
  error: { color: colors.danger },
  button: { minHeight: 44, padding: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontWeight: "600" }
});
