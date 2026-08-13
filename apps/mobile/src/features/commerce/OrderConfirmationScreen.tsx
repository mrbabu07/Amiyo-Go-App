import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";

const money = (minor: string) => `৳${(Number(minor || 0) / 100).toLocaleString("en-BD")}`;

export function OrderConfirmationScreen({ actionUrl, instructions, invoice, orderId, orderNumber, payment, totalMinor }: { actionUrl?: string; instructions?: string; invoice?: string; orderId?: string; orderNumber?: string; payment?: string; totalMinor?: string }) {
  const router = useRouter();
  return <Screen eyebrow="ORDER CONFIRMED" title="Order placed successfully" description="Your order is confirmed. Track delivery, invoice, support, returns, and reviews from your account.">
    <View style={styles.panel}>
      <View style={styles.successIcon}><Ionicons color="#fff" name="checkmark" size={38} /></View>
      <View style={styles.receipt}>
        {orderNumber ? <Row label="Order ID" value={orderNumber} /> : null}
        {totalMinor ? <Row label="Total" value={money(totalMinor)} /> : null}
        {payment ? <Row label="Payment" value={payment.replaceAll("_", " ")} /> : null}
        {invoice ? <Row label="Invoice" value={invoice} /> : null}
        <Row label="Delivery ETA" value="Updates after seller confirmation" />
      </View>
      {instructions ? <Text style={styles.notice}>{instructions}</Text> : null}
      <View style={styles.steps}>{[["cube-outline", "Seller review", "Seller confirms stock and prepares your items."], ["car-outline", "Delivery tracking", "Courier updates appear on the order page."], ["shield-checkmark-outline", "Buyer support", "Returns and support stay linked to this order."]].map(([icon, title, copy]) => <View key={title} style={styles.step}><Ionicons color={colors.primary} name={icon as never} size={24} /><Text style={styles.stepTitle}>{title}</Text><Text style={styles.muted}>{copy}</Text></View>)}</View>
      {actionUrl ? <Pressable onPress={() => void Linking.openURL(actionUrl)} style={styles.primary}><Ionicons color="#fff" name="card-outline" size={19} /><Text style={styles.primaryText}>Complete payment</Text></Pressable> : null}
      <View style={styles.actions}><Pressable onPress={() => router.replace("/products")} style={styles.primary}><Text style={styles.primaryText}>Continue shopping</Text></Pressable>{orderId ? <><Pressable onPress={() => router.push(`/orders/${orderId}/track` as never)} style={styles.secondary}><Text style={styles.secondaryText}>Track order</Text></Pressable><Pressable onPress={() => router.push(`/orders/${orderId}` as never)} style={styles.secondary}><Text style={styles.secondaryText}>Order details</Text></Pressable></> : <Pressable onPress={() => router.push("/orders")} style={styles.secondary}><Text style={styles.secondaryText}>View orders</Text></Pressable>}</View>
    </View>
  </Screen>;
}

function Row({ label, value }: { label: string; value: string }) { return <View style={styles.row}><Text style={styles.muted}>{label}</Text><Text style={styles.value}>{value}</Text></View>; }

const styles = StyleSheet.create({ panel: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, gap: spacing.lg, padding: spacing.xl }, successIcon: { alignItems: "center", backgroundColor: colors.success, borderRadius: radius.pill, height: 72, justifyContent: "center", width: 72 }, receipt: { backgroundColor: colors.background, borderRadius: radius.md, gap: spacing.md, maxWidth: 620, padding: spacing.lg, width: "100%" }, row: { flexDirection: "row", gap: spacing.lg, justifyContent: "space-between" }, value: { color: colors.text, flexShrink: 1, fontWeight: "900", textAlign: "right", textTransform: "capitalize" }, muted: { color: colors.muted, lineHeight: 19 }, notice: { backgroundColor: colors.primarySoft, borderRadius: radius.md, color: colors.primaryDark, maxWidth: 620, padding: spacing.md, width: "100%" }, steps: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "center", width: "100%" }, step: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, gap: spacing.sm, minWidth: 180, padding: spacing.md }, stepTitle: { color: colors.text, fontWeight: "900" }, actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 46, paddingHorizontal: spacing.lg }, primaryText: { color: "#fff", fontWeight: "900" }, secondary: { borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, justifyContent: "center", minHeight: 46, paddingHorizontal: spacing.lg }, secondaryText: { color: colors.primary, fontWeight: "900" } });
