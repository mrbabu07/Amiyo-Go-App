import { useRef, useState } from "react";
import { Link } from "expo-router";
import { shareInvoice, type InvoiceQrRef } from "./share-invoice";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { OrderInvoiceDocument, useInvoicePrintStyles } from "./components/OrderInvoiceDocument";
import { getInvoice } from "./orders.api";

const printId = "customer-print-invoice";

export function InvoiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useCurrentUser();
  const invoice = useQuery({ queryKey: ["invoice", id, user?.uid], queryFn: () => getInvoice(user!, id), enabled: Boolean(user && id) });
  useInvoicePrintStyles(printId);
  const qr = useRef<InvoiceQrRef | null>(null);
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);

  async function printInvoice() {
    if (!invoice.data) return;
    setExporting(true);
    setExportError("");
    try { await shareInvoice(invoice.data.order, invoice.data.number, invoice.data.issuedAt, qr.current, false, printId); }
    catch (error) { setExportError(error instanceof Error ? error.message : "Could not export invoice."); }
    finally { setExporting(false); }
  }

  if (invoice.isLoading) return <Screen title="Invoice"><ActivityIndicator color={colors.primary} /></Screen>;
  if (!invoice.data) return <Screen eyebrow="RECEIPT" title="Invoice unavailable" description="We could not load this invoice right now."><Text style={styles.error}>{invoice.error?.message ?? "Could not load invoice"}</Text></Screen>;

  return <Screen eyebrow="RECEIPT" title={invoice.data.number} description={`Issued ${new Date(invoice.data.issuedAt).toLocaleDateString("en-BD")} with ${invoice.data.order.vendorOrders.length} seller package split.`}>
    <View style={styles.actions}><Pressable disabled={exporting} onPress={printInvoice} style={styles.print}><Ionicons color="#fff" name="print-outline" size={18} /><Text style={styles.printText}>{Platform.OS === "web" ? "Print / Save PDF" : "Share PDF invoice"}</Text></Pressable></View>
    <Link href="/verify-document">Verify invoice or parcel QR</Link>
    {exportError ? <Text accessibilityRole="alert" style={styles.error}>{exportError}</Text> : null}
    <OrderInvoiceDocument getQrRef={(ref) => { qr.current = ref; }} invoiceNumber={invoice.data.number} issuedAt={invoice.data.issuedAt} nativeID={printId} order={invoice.data.order} qrExpiresAt={invoice.data.qrExpiresAt} qrPayload={invoice.data.qrPayload} />
  </Screen>;
}

const styles = StyleSheet.create({
  actions: { alignItems: "flex-end" },
  print: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: 7, minHeight: 44, paddingHorizontal: spacing.lg },
  printText: { color: "#fff", fontWeight: "700" },
  error: { backgroundColor: "#fef2f2", borderRadius: radius.md, color: colors.danger, padding: spacing.md }
});
