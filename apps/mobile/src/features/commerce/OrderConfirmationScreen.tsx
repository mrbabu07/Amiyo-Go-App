import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { formatMinor } from "../../ui/money";
import { colors, radius, spacing } from "../../ui/tokens";

const money = (minor: string) => formatMinor(minor || "0");

type ConfirmationProps = { actionUrl?: string; instructions?: string; invoice?: string; orderId?: string; orderNumber?: string; payment?: string; totalMinor?: string };

export function OrderConfirmationScreen({ actionUrl, instructions, invoice, orderId, orderNumber, payment, totalMinor }: ConfirmationProps) {
  const router = useRouter();
  const compact = useWindowDimensions().width < 620;
  const milestones = [
    ["cube-outline", "Seller review", "Seller confirms stock and prepares your items."],
    ["car-outline", "Delivery tracking", "Courier updates appear on the order page."],
    ["shield-checkmark-outline", "Buyer support", "Returns and support stay linked to this order."]
  ] as const;

  return <Screen eyebrow="ORDER CONFIRMED" title="Order placed successfully" description="Your order is confirmed. Track delivery, invoice, support, returns, and reviews from your account.">
    <View style={[styles.panel, compact && styles.panelCompact]}>
      <View style={styles.successIcon}><Ionicons color={colors.surface} name="checkmark" size={38} /></View>
      <Text style={styles.successTitle}>Thank you for your order</Text>
      <Text style={styles.successCopy}>We will keep you updated as each seller prepares your package.</Text>
      <View style={styles.receipt}>
        {orderNumber ? <Row compact={compact} label="Order ID" value={orderNumber} /> : null}
        {totalMinor ? <Row compact={compact} label="Total" value={money(totalMinor)} /> : null}
        {payment ? <Row compact={compact} label="Payment" value={payment.replaceAll("_", " ")} /> : null}
        {invoice ? <Row compact={compact} label="Invoice" value={invoice} /> : null}
        <Row compact={compact} label="Delivery ETA" value="Updates after seller confirmation" />
      </View>
      {instructions ? <Text style={styles.notice}>{instructions}</Text> : null}
      <View style={styles.steps}>{milestones.map(([icon, title, copy]) => <View key={title} style={[styles.step, compact && styles.stepCompact]}><View style={styles.stepIcon}><Ionicons color={colors.primary} name={icon} size={22} /></View><View style={styles.stepCopy}><Text style={styles.stepTitle}>{title}</Text><Text style={styles.muted}>{copy}</Text></View></View>)}</View>
      {actionUrl ? <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(actionUrl)} style={[styles.primary, compact && styles.actionCompact]}><Ionicons color={colors.surface} name="card-outline" size={19} /><Text style={styles.primaryText}>Complete payment</Text></Pressable> : null}
      <View style={[styles.actions, compact && styles.actionsCompact]}>
        <Pressable onPress={() => router.replace("/products")} style={[styles.primary, compact && styles.actionCompact]}><Text style={styles.primaryText}>Continue shopping</Text></Pressable>
        {orderId ? <><Pressable onPress={() => router.push(`/orders/${orderId}/track` as never)} style={[styles.secondary, compact && styles.actionCompact]}><Text style={styles.secondaryText}>Track order</Text></Pressable><Pressable onPress={() => router.push(`/orders/${orderId}` as never)} style={[styles.secondary, compact && styles.actionCompact]}><Text style={styles.secondaryText}>Order details</Text></Pressable></> : <Pressable onPress={() => router.push("/orders")} style={[styles.secondary, compact && styles.actionCompact]}><Text style={styles.secondaryText}>View orders</Text></Pressable>}
      </View>
    </View>
  </Screen>;
}

function Row({ compact, label, value }: { compact: boolean; label: string; value: string }) { return <View style={[styles.row, compact && styles.rowCompact]}><Text style={styles.muted}>{label}</Text><Text style={[styles.value, compact && styles.valueCompact]}>{value}</Text></View>; }

const styles = StyleSheet.create({
  panel: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.xl, gap: spacing.lg, padding: spacing.xl }, panelCompact: { padding: spacing.lg }, successIcon: { alignItems: "center", backgroundColor: colors.success, borderRadius: radius.pill, height: 72, justifyContent: "center", width: 72 }, successTitle: { color: colors.text, fontSize: 22, fontWeight: "700", textAlign: "center" }, successCopy: { color: colors.muted, lineHeight: 20, maxWidth: 560, textAlign: "center" }, receipt: { backgroundColor: colors.background, borderRadius: radius.md, gap: spacing.md, maxWidth: 620, padding: spacing.lg, width: "100%" }, row: { flexDirection: "row", gap: spacing.lg, justifyContent: "space-between" }, rowCompact: { alignItems: "flex-start", flexDirection: "column", gap: 3 }, value: { color: colors.text, flexShrink: 1, fontWeight: "700", textAlign: "right", textTransform: "capitalize" }, valueCompact: { textAlign: "left" }, muted: { color: colors.muted, lineHeight: 19 }, notice: { backgroundColor: colors.primarySoft, borderRadius: radius.md, color: colors.primaryDark, maxWidth: 620, padding: spacing.md, width: "100%" }, steps: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "center", width: "100%" }, step: { backgroundColor: colors.background, borderRadius: radius.md, flex: 1, gap: spacing.sm, minWidth: 180, padding: spacing.md }, stepCompact: { alignItems: "center", flexDirection: "row", minWidth: 0, width: "100%" }, stepIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 42, justifyContent: "center", width: 42 }, stepCopy: { flex: 1 }, stepTitle: { color: colors.text, fontWeight: "700" }, actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" }, actionsCompact: { width: "100%" }, actionCompact: { width: "100%" }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 46, paddingHorizontal: spacing.lg }, primaryText: { color: colors.surface, fontWeight: "700" }, secondary: { alignItems: "center", borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, justifyContent: "center", minHeight: 46, paddingHorizontal: spacing.lg }, secondaryText: { color: colors.primary, fontWeight: "700" }
});
