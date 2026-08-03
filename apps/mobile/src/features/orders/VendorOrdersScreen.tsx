import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { useAuthStore } from "../auth/auth.store";
import { firebaseAuth } from "../auth/firebase";
import { getVendorOrders } from "./orders.api";

export function VendorOrdersScreen() {
  const router = useRouter(); const user = firebaseAuth?.currentUser ?? null; const session = useAuthStore((state) => state.session); const allowed = Boolean(session?.permissions.includes("orders:read") && session.principal.vendorIds.length);
  const orders = useQuery({ queryKey: ["orders", "vendor"], queryFn: () => getVendorOrders(user!), enabled: Boolean(user && allowed) });
  if (!user || !allowed) return <View style={styles.center}><Ionicons name="lock-closed-outline" size={48} color={colors.primary} /><Text style={styles.title}>Vendor order access required</Text></View>;
  if (orders.isLoading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}><Text accessibilityRole="header" style={styles.title}>Vendor orders</Text>{orders.data?.map((order) => <View key={order.id} style={styles.card}><Pressable accessibilityRole="button" onPress={() => router.push(`/vendor/order/${order.id}` as never)}><View style={styles.row}><View><Text style={styles.order}>{order.orderNumber}</Text><Text style={styles.muted}>{order.shopName} · {order.items.length} lines</Text></View><Text style={styles.status}>{order.status.replaceAll("_", " ")}</Text></View><Text style={styles.total}>৳{(Number(order.total.amountMinor) / 100).toLocaleString("en-BD")}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push(`/vendor/order/${order.id}/documents` as never)} style={styles.document}><Text style={styles.documentText}>Packing slip & parcel label →</Text></Pressable></View>)}</ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { backgroundColor: colors.background, flex: 1 }, page: { alignSelf: "center", gap: spacing.md, maxWidth: 900, padding: spacing.lg, width: "100%" }, title: { color: colors.text, fontSize: 30, fontWeight: "900" }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, padding: spacing.lg }, row: { flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }, order: { color: colors.text, fontSize: 17, fontWeight: "900" }, muted: { color: colors.muted, marginTop: 4 }, status: { color: colors.primary, fontSize: 10, fontWeight: "900" }, total: { color: colors.text, fontSize: 17, fontWeight: "900", marginTop: spacing.md }, document: { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: spacing.md }, documentText: { color: colors.primary, fontWeight: "900" }, center: { alignItems: "center", backgroundColor: colors.background, flex: 1, gap: spacing.md, justifyContent: "center" } });
