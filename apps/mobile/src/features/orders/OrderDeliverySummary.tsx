import type { OrderDto } from "@amiyo/contracts";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { colors, radius, spacing } from "../../ui/tokens";
import { formatMinor } from "../../ui/money";

export function OrderDeliverySummary({ order }: { order: OrderDto }) {
  const address = order.deliveryAddress;
  const payment = order.payment;
  return <View style={styles.stack}>
    <ModuleCard title={order.fulfillmentMethod === "PICKUP" ? "Pickup point" : "Delivery address"} meta="Saved when this order was placed">
      {order.fulfillmentMethod === "PICKUP" && order.pickupPoint ? <View style={styles.stack}><Text style={styles.name}>{order.pickupPoint.name}</Text><Text selectable style={styles.text}>{order.pickupPoint.phone}</Text><Text selectable style={styles.text}>{[order.pickupPoint.address, order.pickupPoint.unionName, order.pickupPoint.upazila, order.pickupPoint.district, order.pickupPoint.division].join(", ")}</Text>{order.pickupPoint.instructions ? <Text style={styles.text}>{order.pickupPoint.instructions}</Text> : null}</View> : address ? <View style={styles.stack}>
        <Text style={styles.name}>{address.recipientName}</Text>
        <Text selectable style={styles.text}>{address.phone}</Text>
        <Text selectable style={styles.text}>{[address.line1, address.line2, address.unionName, address.upazila, address.district, address.division, address.postalCode].filter(Boolean).join(", ")}</Text>
      </View> : <Text style={styles.text}>Delivery information is unavailable for this order.</Text>}
    </ModuleCard>
    <ModuleCard title="Payment details" meta="Payment status is separate from delivery status">
      {payment ? <View style={styles.stack}>
        <Text style={styles.text}>Method: {payment.method.replaceAll("_", " ")}</Text>
        <Text style={styles.text}>Status: {payment.status.replaceAll("_", " ")}</Text>
        <Text style={styles.text}>Provider: {payment.provider}</Text>
        {payment.transactionId ? <Text selectable style={styles.text}>Reference: {payment.transactionId}</Text> : null}
        {payment.actionUrl ? <Link href={payment.actionUrl as never} target="_blank" asChild><Pressable accessibilityRole="link" accessibilityLabel="Continue SSLCommerz payment" style={styles.pay}><Text style={styles.payText}>Continue secure payment</Text></Pressable></Link> : null}
        {payment.refunded && BigInt(payment.refunded.amountMinor) > 0n ? <Text style={styles.text}>Refunded: {formatMinor(payment.refunded.amountMinor, payment.refunded.currency, 2)}</Text> : null}
      </View> : <Text style={styles.text}>No payment record is available yet.</Text>}
    </ModuleCard>
  </View>;
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm, minWidth: 0 },
  name: { color: colors.text, fontSize: 16, fontWeight: "600" },
  text: { color: colors.text, fontSize: 14, lineHeight: 22, flexShrink: 1 },
  pay: { minHeight: 44, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md },
  payText: { color: "#fff", fontWeight: "600" }
});
