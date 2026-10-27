import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useCurrentUser } from "../auth/use-current-user";
import { getVendorOrder } from "./orders.api";
import { OrderItemImage } from "./OrderItemImage";
import { formatMinor } from "../../ui/money";
import { colors, spacing } from "../../ui/tokens";

export function VendorOrderExpansion({ id }: { id: string }) {
  const user = useCurrentUser();
  const router = useRouter();
  const result = useQuery({ queryKey: ["orders", "vendor", id, user?.uid], queryFn: () => getVendorOrder(user!, id), enabled: Boolean(user) });
  if (!user) return null;
  if (result.isLoading) return <ActivityIndicator accessibilityLabel="Loading package details" color={colors.primary} />;
  if (result.error) return <View style={styles.panel}><Text accessibilityRole="alert" style={styles.error}>{result.error.message}</Text><Pressable accessibilityRole="button" onPress={() => void result.refetch()} style={styles.button}><Text style={styles.link}>Retry package details</Text></Pressable></View>;
  const order = result.data;
  if (!order) return null;
  const address = order.deliveryAddress;
  return <View style={styles.panel}>
    <Text accessibilityRole="header" style={styles.heading}>Package details · {order.shopName}</Text>
    {order.items.map((item) => <View key={item.id} style={styles.row}><OrderItemImage name={item.productName} uri={item.thumbnailUrl} /><View style={styles.copy}><Text style={styles.title}>{item.productName}</Text><Text style={styles.muted}>{item.sku} · Quantity {item.quantity}</Text><Text style={styles.muted}>{Object.values(item.attributes ?? {}).filter(Boolean).join(" / ")}</Text><Text style={styles.title}>{formatMinor(item.lineTotal.amountMinor, item.lineTotal.currency)}</Text></View></View>)}
    <View style={styles.columns}><View style={styles.column}><Text style={styles.title}>Customer & handoff</Text><Text style={styles.muted}>{order.customer.displayName} · {address?.phone ?? order.customer.phone ?? "No phone"}</Text><Text style={styles.muted}>{order.fulfillmentMethod === "PICKUP" && order.pickupPoint ? `${order.pickupPoint.name}, ${order.pickupPoint.address}` : address ? [address.line1, address.line2, address.unionName, address.upazila, address.district].filter(Boolean).join(", ") : "Delivery address unavailable"}</Text></View><View style={styles.column}><Text style={styles.title}>Payment & delivery</Text><Text style={styles.muted}>{order.payment?.method ?? "Unknown"} · {order.payment?.status ?? "Unverified"}</Text><Text style={styles.muted}>Tracking: {order.shipment?.trackingNumber ?? "Not assigned"}</Text><Text style={styles.muted}>Package total: {formatMinor(order.total.amountMinor, order.total.currency)}</Text><Text style={styles.muted}>Collection amount must be verified in package details before handoff.</Text></View></View>
    <Text style={styles.title}>Recorded timeline</Text><Text style={styles.muted}>{new Date(order.createdAt).toLocaleString("en-BD")} · Package created</Text>{order.shipment?.events.map((event) => <Text key={event.id} style={styles.muted}>{new Date(event.occurredAt).toLocaleString("en-BD")} · {event.status.replaceAll("_", " ")} · {event.description ?? "No note"}</Text>)}
    <View style={styles.columns}><Pressable accessibilityRole="link" onPress={() => router.push(`/vendor/order/${id}` as never)} style={styles.button}><Text style={styles.link}>Manage package & message buyer</Text></Pressable><Pressable accessibilityRole="link" onPress={() => router.push(`/vendor/order/${id}/documents` as never)} style={styles.button}><Text style={styles.link}>Parcel sticker / packing slip</Text></Pressable></View>
  </View>;
}

const styles = StyleSheet.create({ panel: { backgroundColor: colors.background, padding: spacing.md, gap: spacing.sm }, heading: { color: colors.text, fontWeight: "600", fontSize: 18 }, row: { flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.sm }, copy: { flex: 1, minWidth: 0 }, title: { color: colors.text, fontWeight: "600" }, muted: { color: colors.muted, lineHeight: 20 }, columns: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, column: { flexGrow: 1, flexBasis: 240, minWidth: 0 }, button: { minHeight: 44, padding: spacing.sm, backgroundColor: colors.primarySoft, borderRadius: 10, justifyContent: "center" }, link: { color: colors.primary, fontWeight: "600" }, error: { color: colors.danger } });
