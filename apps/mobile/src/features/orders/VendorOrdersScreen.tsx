import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { useAuthStore } from "../auth/auth.store";
import { firebaseAuth } from "../auth/firebase";
import { getVendorOrders } from "./orders.api";
import { BatchDocuments } from "./BatchDocuments";
import { batchDocumentLimit } from "./batch-documents";

export function VendorOrdersScreen() {
  const [selected, setSelected] = useState<string[]>([]);
  const router = useRouter(); const user = firebaseAuth?.currentUser ?? null; const session = useAuthStore((state) => state.session); const allowed = Boolean(session?.permissions.includes("orders:read") && session.principal.vendorIds.length);
  const orders = useQuery({ queryKey: ["orders", "vendor"], queryFn: () => getVendorOrders(user!), enabled: Boolean(user && allowed) });
  if (!user || !allowed) return <View style={styles.center}><Ionicons name="lock-closed-outline" size={48} color={colors.primary} /><Text style={styles.title}>Vendor order access required</Text></View>;
  if (orders.isLoading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  const selectedIds = selected.filter((id) => orders.data?.some((order) => order.id === id));
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}>
    <Text accessibilityRole="header" style={styles.title}>Vendor orders</Text>
    {orders.error ? <Text accessibilityRole="alert" style={styles.muted}>{orders.error.message}</Text> : null}
    {!orders.error && !orders.data?.length ? <Text style={styles.muted}>No orders yet.</Text> : null}
    <BatchDocuments key={selectedIds.join(",")} ids={selectedIds} user={user} />
    {selectedIds.length ? <Pressable accessibilityRole="button" onPress={() => setSelected([])} style={{ minHeight: 44, justifyContent: "center" }}><Text style={styles.documentText}>Clear selection</Text></Pressable> : null}
    {orders.data?.map((order) => <View key={order.id} style={styles.card}>
      <Pressable accessibilityRole="checkbox" accessibilityLabel={`Select package ${order.orderNumber} from ${order.shopName}`} accessibilityState={{ checked: selectedIds.includes(order.id), disabled: !selectedIds.includes(order.id) && selectedIds.length >= batchDocumentLimit }} disabled={!selectedIds.includes(order.id) && selectedIds.length >= batchDocumentLimit} onPress={() => setSelected(selectedIds.includes(order.id) ? selectedIds.filter((id) => id !== order.id) : [...selectedIds, order.id])} style={{ minHeight: 44, justifyContent: "center" }}><Text style={styles.documentText}>{selectedIds.includes(order.id) ? "☑ Selected" : "☐ Select for batch print"}</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push(`/vendor/order/${order.id}` as never)}><View style={styles.row}><View><Text style={styles.order}>{order.orderNumber}</Text><Text style={styles.muted}>{order.shopName} · {order.items.length} lines</Text></View><Text style={styles.status}>{order.status.replaceAll("_", " ")}</Text></View><Text style={styles.total}>৳{(Number(order.total.amountMinor) / 100).toLocaleString("en-BD")}</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push(`/vendor/order/${order.id}/documents` as never)} style={styles.document}><Text style={styles.documentText}>Packing slip & parcel label →</Text></Pressable>
    </View>)}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { backgroundColor: colors.background, flex: 1 }, page: { alignSelf: "center", gap: spacing.md, maxWidth: 900, padding: spacing.lg, width: "100%" }, title: { color: colors.text, fontSize: 30, fontWeight: "700" }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, padding: spacing.lg }, row: { flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }, order: { color: colors.text, fontSize: 17, fontWeight: "700" }, muted: { color: colors.muted, marginTop: 4 }, status: { color: colors.primary, fontSize: 10, fontWeight: "700" }, total: { color: colors.text, fontSize: 17, fontWeight: "700", marginTop: spacing.md }, document: { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: spacing.md }, documentText: { color: colors.primary, fontWeight: "700" }, center: { alignItems: "center", backgroundColor: colors.background, flex: 1, gap: spacing.md, justifyContent: "center" } });
