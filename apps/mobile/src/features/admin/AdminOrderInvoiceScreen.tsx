import { useRef, useState } from "react";
import { Link } from "expo-router";
import { shareInvoice, type InvoiceQrRef } from "../orders/share-invoice";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { OrderInvoiceDocument, useInvoicePrintStyles } from "../orders/components/OrderInvoiceDocument";
import { getAdminOrderDetail, issueAdminOrderInvoice } from "./admin.api";

const printId = "admin-print-invoice";

export function AdminOrderInvoiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = firebaseAuth?.currentUser ?? null;
  const query = useQuery({ queryKey: ["admin", "order", id], queryFn: () => getAdminOrderDetail(user!, id), enabled: Boolean(user && id) });
  useInvoicePrintStyles(printId);
  const qr = useRef<InvoiceQrRef | null>(null);
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const issue = useMutation({ mutationFn: () => issueAdminOrderInvoice(user!, id), onSuccess: () => query.refetch() });

  async function printInvoice() {
    if (!query.data?.invoice) return;
    setExporting(true);
    setExportError("");
    try { await shareInvoice(query.data, query.data.invoice?.number ?? `INV-${query.data.orderNumber}`, query.data.invoice?.issuedAt ?? query.data.createdAt, qr.current, true); }
    catch (error) { setExportError(error instanceof Error ? error.message : "Could not export invoice."); }
    finally { setExporting(false); }
  }

  if (query.isLoading) return <Screen title="Invoice"><ActivityIndicator color={colors.primary} /></Screen>;
  if (!query.data) return <Screen title="Invoice"><Text style={styles.error}>{query.error?.message ?? "Invoice unavailable"}</Text></Screen>;

  const order = query.data;
  return <Screen eyebrow="FINANCE DOCUMENT" title={order.invoice?.number ?? `INV-${order.orderNumber}`} description="Admin invoice includes customer totals, seller package splits, shipment references and commission reconciliation.">
    <View style={styles.actions}>{!order.invoice ? <Pressable accessibilityRole="button" disabled={issue.isPending} onPress={() => issue.mutate()} style={styles.print}><Text style={styles.printText}>{issue.isPending ? "Issuing…" : "Issue invoice"}</Text></Pressable> : <Pressable disabled={exporting} onPress={printInvoice} style={styles.print}><Ionicons color="#fff" name="print-outline" size={18} /><Text style={styles.printText}>{Platform.OS === "web" ? "Print / Save PDF" : "Share PDF invoice"}</Text></Pressable>}</View>
    {issue.error ? <Text accessibilityRole="alert" style={styles.error}>{issue.error.message}</Text> : null}
    <Link href="/verify-document">Verify invoice or parcel QR</Link>
    {exportError ? <Text accessibilityRole="alert" style={styles.error}>{exportError}</Text> : null}
    <OrderInvoiceDocument getQrRef={(ref) => { qr.current = ref; }} audience="admin" invoiceNumber={order.invoice?.number ?? `INV-${order.orderNumber}`} issuedAt={order.invoice?.issuedAt ?? order.createdAt} nativeID={printId} order={order} qrExpiresAt={order.invoice?.qrExpiresAt} qrPayload={order.invoice?.qrPayload} />
  </Screen>;
}

const styles = StyleSheet.create({
  actions: { alignItems: "flex-end" },
  print: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: 7, minHeight: 44, paddingHorizontal: spacing.lg },
  printText: { color: "#fff", fontWeight: "700" },
  error: { color: colors.danger, padding: spacing.md }
});
