import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { OrderInvoiceDocument, useInvoicePrintStyles } from "../orders/components/OrderInvoiceDocument";
import { getAdminOrderDetail } from "./admin.api";

const printId = "admin-print-invoice";

export function AdminOrderInvoiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = firebaseAuth?.currentUser ?? null;
  const query = useQuery({ queryKey: ["admin", "order", id], queryFn: () => getAdminOrderDetail(user!, id), enabled: Boolean(user && id) });
  useInvoicePrintStyles(printId);

  async function printInvoice() {
    if (!query.data) return;
    if (Platform.OS === "web") { window.print(); return; }
    if (query.data.invoice?.storageUrl) await Linking.openURL(query.data.invoice.storageUrl);
  }

  if (query.isLoading) return <Screen title="Invoice"><ActivityIndicator color={colors.primary} /></Screen>;
  if (!query.data) return <Screen title="Invoice"><Text style={styles.error}>{query.error?.message ?? "Invoice unavailable"}</Text></Screen>;

  const order = query.data;
  return <Screen eyebrow="FINANCE DOCUMENT" title={order.invoice?.number ?? `INV-${order.orderNumber}`} description="Admin invoice includes customer totals, seller package splits, shipment references and commission reconciliation.">
    <View style={styles.actions}><Pressable onPress={printInvoice} style={styles.print}><Ionicons color="#fff" name="print-outline" size={18} /><Text style={styles.printText}>{Platform.OS === "web" ? "Print / Save PDF" : "Open PDF"}</Text></Pressable></View>
    <OrderInvoiceDocument audience="admin" invoiceNumber={order.invoice?.number ?? `INV-${order.orderNumber}`} issuedAt={order.invoice?.issuedAt ?? order.createdAt} nativeID={printId} order={order} />
  </Screen>;
}

const styles = StyleSheet.create({
  actions: { alignItems: "flex-end" },
  print: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: 7, minHeight: 44, paddingHorizontal: spacing.lg },
  printText: { color: "#fff", fontWeight: "700" },
  error: { color: colors.danger, padding: spacing.md }
});
