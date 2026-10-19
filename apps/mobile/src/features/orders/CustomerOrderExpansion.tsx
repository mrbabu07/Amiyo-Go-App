import type { OrderDto } from "@amiyo/contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useCurrentUser } from "../auth/use-current-user";
import { colors, radius, spacing } from "../../ui/tokens";
import { formatMinor } from "../../ui/money";
import { getCustomerOrder, getOrderTracking } from "./orders.api";
import { OrderItemImage } from "./OrderItemImage";
import { CustomerReturnWizard } from "../operations/CustomerReturnWizard";
import { OrderReviewForm } from "./OrderReviewForm";
import { InlineOrderCancellation } from "./InlineOrderCancellation";
import { OrderReorder } from "./OrderReorder";
import { returnActionState } from "./return-action";

const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const money = (value: OrderDto["total"]) => formatMinor(value.amountMinor, value.currency, 2);

export function CustomerOrderExpansion({ id, compact }: { id: string; compact: boolean }) {
  const user = useCurrentUser();
  const [showReturn, setShowReturn] = useState(false);
  const order = useQuery({ queryKey: ["orders", "customer", id, user?.uid], queryFn: () => getCustomerOrder(user!, id), enabled: Boolean(user), retry: false, refetchInterval: 30_000 });
  const tracking = useQuery({ queryKey: ["orders", id, "tracking", user?.uid], queryFn: () => getOrderTracking(user!, id), enabled: Boolean(user), retry: false, refetchInterval: 30_000 });
  if (!user) return null;
  if (!order.data) return <View style={styles.content}>{order.isLoading ? <><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>Loading order details…</Text></> : <Retry message={order.error?.message || "Order details are unavailable."} onRetry={() => void order.refetch()} />}</View>;
  const detail = order.data;
  const returnAction = returnActionState(detail, Date.now());
  return <View style={styles.content}>
    <InlineOrderCancellation key={`${user.uid}:${id}`} order={detail} />
    {detail.vendorOrders.reduce((count, pack) => count + pack.items.length, 0) > 1 ? <OrderReorder key={`reorder:${user.uid}:${id}`} items={detail.vendorOrders.flatMap((pack) => pack.items)} /> : null}
    {returnAction.available ? showReturn ? <CustomerReturnWizard key={`${user.uid}:${id}`} initialOrderId={id} onClose={() => setShowReturn(false)} /> : <Pressable accessibilityRole="button" onPress={() => setShowReturn(true)} style={styles.retryButton}><Text style={styles.title}>Request return</Text></Pressable> : <View style={styles.notice}><Text accessibilityRole="header" style={styles.title}>Return availability</Text><Text style={styles.muted}>{returnAction.message}</Text></View>}
    <View style={styles.notice}><Text style={styles.title}>{label(detail.status)}</Text><Text style={styles.muted}>Each seller package has its own fulfillment status. Shipment events below are recorded updates, not estimated completion.</Text></View>
    {!['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(detail.status) ? <View style={styles.notice}><Text accessibilityRole="header" style={styles.title}>Delivery rescheduling</Text><Text style={styles.muted}>Choosing a different delivery slot is not available yet. Courier scheduling support must be connected before a new slot can be confirmed.</Text><Pressable accessibilityRole="button" accessibilityState={{ disabled: true }} disabled style={styles.retryButton}><Text style={styles.muted}>Courier API pending</Text></Pressable></View> : null}
    {order.error ? <Retry message="Order details could not refresh. Showing the last loaded details." onRetry={() => void order.refetch()} /> : null}
    {detail.vendorOrders.map((pack) => {
      const shipment = tracking.data?.shipments.find((entry) => entry.vendorOrderId === pack.id)?.shipment;
      return <View key={pack.id} style={styles.package}>
        <View style={styles.row}><Text accessibilityRole="header" style={styles.title}>{pack.shopName || pack.vendorName || "Seller package"}</Text><Text style={styles.badge}>{label(pack.status)}</Text></View>
        {pack.items.map((item) => <View key={item.id} style={[styles.item, compact && styles.stacked]}>
          <View style={styles.itemIdentity}><OrderItemImage name={item.productName} uri={item.thumbnailUrl} /><View style={styles.itemCopy}><Text style={styles.title}>{item.productName}</Text><Text style={styles.muted}>SKU: {item.sku} · Qty: {item.quantity}</Text><Text style={styles.muted}>{Object.entries(item.attributes ?? {}).filter(([, value]) => typeof value === "string" || typeof value === "number").map(([key, value]) => `${key}: ${value}`).join(" · ")}</Text><Text style={styles.muted}>{money(item.unitPrice)} each</Text></View></View>
          <View style={styles.itemPrice}><Text style={styles.amount}>{money(item.lineTotal)}</Text>{BigInt(item.discount.amountMinor) > 0n ? <Text style={styles.muted}>Discount: {money(item.discount)}</Text> : null}</View>
        </View>)}
        {pack.items.map((item) => <View key={`actions:${user.uid}:${item.id}`} style={styles.itemCopy}><Text style={styles.title}>{item.productName}</Text><OrderReorder items={[item]} />{detail.status === "DELIVERED" ? <OrderReviewForm orderItemId={item.id} productName={item.productName} /> : null}</View>)}
        <View style={styles.packageTotals}><Amount label="Package subtotal" value={pack.subtotal} /><Amount label="Delivery" value={pack.delivery} /><Amount label="Package total" value={pack.total} /></View>
        <View style={styles.tracking}>
          <Text accessibilityRole="header" style={styles.title}>Delivery updates</Text>
          {tracking.isLoading ? <ActivityIndicator accessibilityLabel="Loading delivery updates" color={colors.primary} /> : tracking.error ? <Retry message="Delivery updates could not load." onRetry={() => void tracking.refetch()} /> : shipment ? <>
            <Text style={styles.muted}>{shipment.trackingNumber ? `Tracking: ${shipment.trackingNumber}` : "Tracking number pending"}</Text>
            {shipment.events.length ? shipment.events.map((event) => <View key={event.id} style={styles.event}><Text style={styles.title}>{label(event.status)}</Text><Text style={styles.muted}>{event.description || "Shipment updated"}</Text><Text style={styles.caption}>{new Date(event.occurredAt).toLocaleString("en-BD")}{event.location ? ` · ${event.location}` : ""}</Text></View>) : <Text style={styles.muted}>No courier events recorded yet.</Text>}
          </> : <Text style={styles.muted}>No shipment has been recorded for this package.</Text>}
        </View>
      </View>;
    })}
    <View style={[styles.summary, compact && styles.stacked]}>
      <View style={[styles.summaryCard, compact && styles.fullWidth]}>
        <Text accessibilityRole="header" style={styles.title}>Delivery address</Text>
        {detail.deliveryAddress ? <><Text style={styles.title}>{detail.deliveryAddress.recipientName}</Text><Text style={styles.muted}>{detail.deliveryAddress.phone}</Text><Text style={styles.muted}>{[detail.deliveryAddress.line1, detail.deliveryAddress.line2, detail.deliveryAddress.unionName, detail.deliveryAddress.upazila, detail.deliveryAddress.district, detail.deliveryAddress.division, detail.deliveryAddress.postalCode].filter(Boolean).join(", ")}</Text></> : <Text style={styles.muted}>Delivery address not recorded.</Text>}
        <Text accessibilityRole="header" style={styles.title}>Payment</Text>
        {detail.payment ? <><Text style={styles.muted}>{label(detail.payment.method)} · {label(detail.payment.status)}</Text><Text style={styles.muted}>Payment amount: {money(detail.payment.amount)}</Text>{detail.payment.refunded ? <Text style={styles.muted}>Refunded: {money(detail.payment.refunded)}</Text> : null}</> : <Text style={styles.muted}>Payment information not recorded.</Text>}
      </View>
      <View style={[styles.summaryCard, compact && styles.fullWidth]}><Text accessibilityRole="header" style={styles.title}>Order summary</Text><Amount label="Subtotal" value={detail.subtotal} /><Amount label="Discount" value={detail.discount} /><Amount label="Delivery" value={detail.delivery} /><Amount label="Tax" value={detail.tax} /><Amount label="Total" value={detail.total} /></View>
    </View>
  </View>;
}

function Amount({ label: title, value }: { label: string; value: OrderDto["total"] }) { return <View style={styles.row}><Text style={styles.muted}>{title}</Text><Text style={styles.amount}>{money(value)}</Text></View>; }
function Retry({ message, onRetry }: { message: string; onRetry(): void }) { return <View style={styles.retry}><Text accessibilityRole="alert" style={styles.error}>{message}</Text><Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}><Text style={styles.title}>Try again</Text></Pressable></View>; }

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.lg },
  notice: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  title: { color: colors.text, fontSize: 14, fontWeight: "600", flexShrink: 1 },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 19, flexShrink: 1 },
  caption: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  package: { gap: spacing.md, minWidth: 0 },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  badge: { color: colors.primary, backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, fontSize: 11, overflow: "hidden" },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, backgroundColor: colors.background, borderRadius: radius.md },
  itemIdentity: { flexDirection: "row", gap: spacing.sm, flexShrink: 1, minWidth: 0 },
  itemCopy: { flex: 1, minWidth: 0, gap: 3 },
  itemPrice: { flexShrink: 0, gap: 4 },
  amount: { color: colors.text, fontWeight: "600", fontSize: 13 },
  packageTotals: { gap: spacing.sm },
  tracking: { gap: spacing.sm, padding: spacing.md, backgroundColor: colors.accentSoft, borderRadius: radius.md },
  event: { gap: 3, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  summary: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  summaryCard: { flex: 1, minWidth: 0, padding: spacing.md, backgroundColor: colors.background, borderRadius: radius.md, gap: spacing.sm },
  stacked: { flexDirection: "column", alignItems: "stretch" },
  fullWidth: { flexGrow: 0, flexShrink: 0, flexBasis: "auto", width: "100%" },
  retry: { gap: spacing.sm },
  retryButton: { minHeight: 44, padding: spacing.sm, justifyContent: "center", alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.md },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19 }
});
