import { Fragment } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { getVendorOrders } from "./orders.api";
import { OrderItemImage } from "./OrderItemImage";
import { VendorOrderExpansion } from "./VendorOrderExpansion";
import { batchDocumentLimit } from "./batch-documents";
import { colors, spacing } from "../../ui/tokens";
import { formatMinor } from "../../ui/money";

type Order = Awaited<ReturnType<typeof getVendorOrders>>["data"][number];
export function VendorOrderTable({ orders, selectedIds, onSelect, expandedId, onExpand, uid }: { orders: Order[]; selectedIds: string[]; onSelect(ids: string[]): void; expandedId: string | null; onExpand(id: string | null): void; uid: string }) {
  const router = useRouter();
  return <View style={styles.table} accessibilityLabel="Seller order table">
    <View style={[styles.row, styles.header]}>{["Select", "Order / customer", "Products", "Payment / total", "Status", "Actions"].map((title, index) => <Text key={title} style={[styles.heading, index === 0 ? styles.selection : index === 2 ? styles.products : styles.cell]}>{title}</Text>)}</View>
    {orders.map((order) => {
      const checked = selectedIds.includes(order.id);
      const disabled = !checked && selectedIds.length >= batchDocumentLimit;
      return <Fragment key={order.id}><View style={styles.row}>
        <View style={styles.selection}><Pressable accessibilityRole="checkbox" accessibilityLabel={`Select ${order.orderNumber} ${order.shopName}`} accessibilityState={{ checked, disabled }} disabled={disabled} onPress={() => onSelect(checked ? selectedIds.filter((id) => id !== order.id) : [...selectedIds, order.id])} style={styles.checkbox}><Text style={styles.link}>{checked ? "☑" : "☐"}</Text></Pressable></View>
        <View style={styles.cell}><Text style={styles.strong}>{order.orderNumber}</Text><Text style={styles.text}>{order.shopName}</Text><Text style={styles.muted}>{order.customer.displayName}</Text><Text style={styles.muted}>{new Date(order.createdAt).toLocaleDateString("en-BD")}</Text></View>
        <View style={[styles.products, styles.productRow]}>{order.items[0] ? <OrderItemImage name={order.items[0].productName} uri={order.items[0].thumbnailUrl} /> : null}<View style={styles.cell}><Text numberOfLines={2} style={styles.text}>{order.items.map((item) => item.productName).join(", ")}</Text><Text style={styles.muted}>{order.items.reduce((sum, item) => sum + item.quantity, 0)} units</Text></View></View>
        <View style={styles.cell}><Text style={styles.strong}>{formatMinor(order.total.amountMinor, order.total.currency)}</Text><Text style={styles.muted}>{order.payment?.method ?? "Unknown"}</Text><Text style={styles.muted}>{order.payment?.status ?? "Unverified"}</Text></View>
        <View style={styles.cell}><Text style={styles.status}>{order.status.replaceAll("_", " ")}</Text></View>
        <View style={styles.cell}><Pressable accessibilityRole="button" accessibilityState={{ expanded: expandedId === order.id }} onPress={() => onExpand(expandedId === order.id ? null : order.id)} style={styles.button}><Text style={styles.link}>{expandedId === order.id ? "Hide details" : "View details"}</Text></Pressable><Pressable accessibilityRole="link" onPress={() => router.push(`/vendor/order/${order.id}` as never)} style={styles.button}><Text style={styles.link}>Manage</Text></Pressable><Pressable accessibilityRole="link" onPress={() => router.push(`/vendor/order/${order.id}/documents` as never)} style={styles.button}><Text style={styles.link}>Print / PDF</Text></Pressable></View>
      </View>{expandedId === order.id ? <VendorOrderExpansion key={`${uid}:${order.id}`} id={order.id} /> : null}</Fragment>;
    })}
  </View>;
}

const styles = StyleSheet.create({ table: { backgroundColor: colors.surface, borderRadius: 16, overflow: "hidden" }, row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }, header: { backgroundColor: colors.primarySoft }, heading: { color: colors.text, fontWeight: "600" }, cell: { flex: 1, minWidth: 0, gap: 4 }, selection: { width: 48 }, products: { flex: 1.8, minWidth: 0 }, productRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" }, text: { color: colors.text }, muted: { color: colors.muted, fontSize: 11, lineHeight: 17 }, strong: { color: colors.text, fontWeight: "600" }, status: { color: colors.primary, fontSize: 11, fontWeight: "600" }, button: { minHeight: 44, justifyContent: "center" }, checkbox: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" }, link: { color: colors.primary, fontWeight: "600", fontSize: 12 } });
