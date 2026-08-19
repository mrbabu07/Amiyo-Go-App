import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { getAdminOrderDetail } from "./admin.api";

const money = (minor: string) => `৳${(Number(minor) / 100).toLocaleString("en-BD", { minimumFractionDigits: 2 })}`;

export function AdminOrderInvoiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = firebaseAuth?.currentUser ?? null;
  const query = useQuery({ queryKey: ["admin", "order", id], queryFn: () => getAdminOrderDetail(user!, id), enabled: Boolean(user && id) });
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const style = document.createElement("style");
    style.textContent = "@media print{body *{visibility:hidden!important}#admin-print-invoice,#admin-print-invoice *{visibility:visible!important}#admin-print-invoice{position:absolute!important;inset:0 auto auto 0!important;width:100%!important;border:0!important;box-shadow:none!important} @page{size:A4;margin:14mm}}";
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  if (query.isLoading) return <Screen title="Invoice"><ActivityIndicator color={colors.primary} /></Screen>;
  if (!query.data) return <Screen title="Invoice"><Text style={styles.error}>{query.error?.message ?? "Invoice unavailable"}</Text></Screen>;
  const order = query.data;
  const address = order.deliveryAddress;

  async function printInvoice() {
    if (Platform.OS === "web") { window.print(); return; }
    if (order.invoice?.storageUrl) await Linking.openURL(order.invoice.storageUrl);
  }

  return <Screen eyebrow="FINANCE DOCUMENT" title={order.invoice?.number ?? `INV-${order.orderNumber}`} description="Print or save this customer invoice as PDF from your browser.">
    <View style={styles.actions}><Pressable onPress={printInvoice} style={styles.print}><Ionicons color="#fff" name="print-outline" size={18} /><Text style={styles.printText}>{Platform.OS === "web" ? "Print / Save PDF" : "Open PDF"}</Text></Pressable></View>
    <View nativeID="admin-print-invoice" style={styles.invoice}>
      <View style={styles.header}><View><View style={styles.brand}><View style={styles.mark}><Text style={styles.markText}>A</Text></View><View><Text style={styles.brandName}>Amiyo-Go</Text><Text style={styles.brandSub}>Marketplace Invoice</Text></View></View><Text style={styles.company}>Bangladesh · support@amiyo-go.com</Text></View><View style={styles.invoiceMeta}><Text style={styles.invoiceTitle}>INVOICE</Text><Text style={styles.invoiceNumber}>{order.invoice?.number ?? `INV-${order.orderNumber}`}</Text><Text style={styles.meta}>Issued: {new Date(order.invoice?.issuedAt ?? order.createdAt).toLocaleDateString("en-BD")}</Text></View></View>
      <View style={styles.rule} />
      <View style={styles.parties}><View style={styles.party}><Text style={styles.label}>BILL TO</Text><Text style={styles.partyName}>{order.customer.displayName}</Text><Text style={styles.meta}>{order.customer.email ?? ""}</Text><Text style={styles.meta}>{address?.phone ?? order.customer.phone ?? ""}</Text><Text style={styles.meta}>{address ? [address.line1, address.line2, address.unionName, address.upazila, address.district, address.division, address.postalCode].filter(Boolean).join(", ") : "Address unavailable"}</Text></View><View style={styles.party}><Text style={styles.label}>ORDER DETAILS</Text><InvoiceInfo label="Order" value={order.orderNumber} /><InvoiceInfo label="Status" value={order.status.replaceAll("_", " ")} /><InvoiceInfo label="Payment" value={`${order.payment?.method ?? "—"} · ${order.payment?.status ?? "UNPAID"}`} /><InvoiceInfo label="Transaction" value={order.payment?.transactionId ?? "—"} /></View></View>
      <View style={styles.table}><View style={styles.tableHead}><Text style={[styles.headText, styles.product]}>PRODUCT</Text><Text style={styles.headText}>QTY</Text><Text style={styles.headText}>UNIT</Text><Text style={[styles.headText, styles.right]}>TOTAL</Text></View>{order.vendorOrders.flatMap((vendorOrder) => vendorOrder.items.map((item) => <View key={item.id} style={styles.row}><View style={styles.product}><Text style={styles.productName}>{item.productName}</Text><Text style={styles.meta}>{vendorOrder.shopName} · {item.sku}</Text></View><Text style={styles.cell}>{item.quantity}</Text><Text style={styles.cell}>{money(item.unitPrice.amountMinor)}</Text><Text style={[styles.cell, styles.right]}>{money(item.lineTotal.amountMinor)}</Text></View>))}</View>
      <View style={styles.summary}><InvoiceTotal label="Subtotal" value={money(order.subtotal.amountMinor)} /><InvoiceTotal label="Discount" value={`−${money(order.discount.amountMinor)}`} /><InvoiceTotal label="Delivery" value={money(order.delivery.amountMinor)} /><InvoiceTotal label="Tax" value={money(order.tax.amountMinor)} /><View style={styles.grand}><Text style={styles.grandLabel}>TOTAL</Text><Text style={styles.grandValue}>{money(order.total.amountMinor)}</Text></View></View>
      <View style={styles.footer}><Text style={styles.footerTitle}>Thank you for shopping with Amiyo-Go.</Text><Text style={styles.meta}>This customer invoice excludes marketplace commission and seller payout deductions.</Text><Text style={styles.meta}>Generated from the authoritative order record on {new Date().toLocaleString("en-BD")}.</Text></View>
    </View>
  </Screen>;
}

function InvoiceInfo({ label, value }: { label: string; value: string }) { return <View style={styles.info}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>; }
function InvoiceTotal({ label, value }: { label: string; value: string }) { return <View style={styles.totalRow}><Text style={styles.totalLabel}>{label}</Text><Text style={styles.totalValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  actions: { alignItems: "flex-end" }, print: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: 7, minHeight: 44, paddingHorizontal: spacing.lg }, printText: { color: "#fff", fontWeight: "700" }, invoice: { alignSelf: "center", backgroundColor: "#fff", borderColor: "#dbe3ea", borderRadius: radius.lg, borderWidth: 1, maxWidth: 850, padding: 32, width: "100%" }, header: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.lg, justifyContent: "space-between" }, brand: { alignItems: "center", flexDirection: "row", gap: spacing.sm }, mark: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, height: 46, justifyContent: "center", width: 46 }, markText: { color: "#fff", fontSize: 24, fontWeight: "700" }, brandName: { color: "#0f172a", fontSize: 22, fontWeight: "700" }, brandSub: { color: "#64748b", fontSize: 10, fontWeight: "600", letterSpacing: 1 }, company: { color: "#64748b", fontSize: 11, marginTop: spacing.sm }, invoiceMeta: { alignItems: "flex-end" }, invoiceTitle: { color: colors.primary, fontSize: 28, fontWeight: "700", letterSpacing: 2 }, invoiceNumber: { color: "#0f172a", fontWeight: "700" }, meta: { color: "#64748b", fontSize: 10, lineHeight: 16 }, rule: { backgroundColor: colors.primary, height: 3, marginVertical: spacing.lg }, parties: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xl, justifyContent: "space-between" }, party: { flex: 1, minWidth: 240 }, label: { color: colors.primary, fontSize: 9, fontWeight: "700", letterSpacing: 1.2, marginBottom: spacing.sm }, partyName: { color: "#0f172a", fontSize: 16, fontWeight: "700" }, info: { flexDirection: "row", gap: spacing.sm, justifyContent: "space-between", marginBottom: 5 }, infoLabel: { color: "#64748b", fontSize: 10 }, infoValue: { color: "#0f172a", flex: 1, fontSize: 10, fontWeight: "600", textAlign: "right" }, table: { borderColor: "#e2e8f0", borderRadius: radius.md, borderWidth: 1, marginTop: spacing.xl, overflow: "hidden" }, tableHead: { backgroundColor: "#0f172a", flexDirection: "row", padding: spacing.sm }, headText: { color: "#fff", fontSize: 9, fontWeight: "700", width: 90 }, product: { flex: 1, minWidth: 180 }, right: { textAlign: "right" }, row: { alignItems: "center", borderBottomColor: "#e2e8f0", borderBottomWidth: 1, flexDirection: "row", padding: spacing.sm }, productName: { color: "#0f172a", fontSize: 11, fontWeight: "600" }, cell: { color: "#0f172a", fontSize: 10, width: 90 }, summary: { alignSelf: "flex-end", marginTop: spacing.lg, minWidth: 300 }, totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 }, totalLabel: { color: "#64748b" }, totalValue: { color: "#0f172a", fontWeight: "600" }, grand: { backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm, padding: spacing.md }, grandLabel: { color: colors.primary, fontWeight: "700" }, grandValue: { color: colors.primary, fontSize: 20, fontWeight: "700" }, footer: { borderTopColor: "#e2e8f0", borderTopWidth: 1, gap: 4, marginTop: 32, paddingTop: spacing.md }, footerTitle: { color: "#0f172a", fontWeight: "700" }, error: { color: colors.danger }
});
