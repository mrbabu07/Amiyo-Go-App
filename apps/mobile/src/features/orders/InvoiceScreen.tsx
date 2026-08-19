import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Linking, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { OrderInvoiceDocument, useInvoicePrintStyles } from "./components/OrderInvoiceDocument";
import { getInvoice } from "./orders.api";

const printId = "customer-print-invoice";

export function InvoiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = firebaseAuth?.currentUser ?? null;
  const invoice = useQuery({ queryKey: ["invoice", id], queryFn: () => getInvoice(user!, id), enabled: Boolean(user && id) });
  useInvoicePrintStyles(printId);

  async function printInvoice() {
    if (!invoice.data) return;
    if (Platform.OS === "web") { window.print(); return; }
    if (invoice.data.storageUrl) await Linking.openURL(invoice.data.storageUrl);
    else await Share.share({ title: invoice.data.number, message: `${invoice.data.number}\nOrder ${invoice.data.order.orderNumber}\nTotal ${invoice.data.order.total.currency} ${Number(invoice.data.order.total.amountMinor) / 100}` });
  }

  if (invoice.isLoading) return <Screen title="Invoice"><ActivityIndicator color={colors.primary} /></Screen>;
  if (!invoice.data) return <Screen eyebrow="RECEIPT" title="Invoice unavailable" description="We could not load this invoice right now."><Text style={styles.error}>{invoice.error?.message ?? "Could not load invoice"}</Text></Screen>;

  return <Screen eyebrow="RECEIPT" title={invoice.data.number} description={`Issued ${new Date(invoice.data.issuedAt).toLocaleDateString("en-BD")} with ${invoice.data.order.vendorOrders.length} seller package split.`}>
    <View style={styles.actions}><Pressable onPress={printInvoice} style={styles.print}><Ionicons color="#fff" name="print-outline" size={18} /><Text style={styles.printText}>{Platform.OS === "web" ? "Print / Save PDF" : invoice.data.storageUrl ? "Open PDF invoice" : "Share invoice"}</Text></Pressable></View>
    <OrderInvoiceDocument invoiceNumber={invoice.data.number} issuedAt={invoice.data.issuedAt} nativeID={printId} order={invoice.data.order} />
  </Screen>;
}

const styles = StyleSheet.create({
  actions: { alignItems: "flex-end" },
  print: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: 7, minHeight: 44, paddingHorizontal: spacing.lg },
  printText: { color: "#fff", fontWeight: "700" },
  error: { backgroundColor: "#fef2f2", borderRadius: radius.md, color: colors.danger, padding: spacing.md }
});
