import { useEffect } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../../../ui/tokens";

type Money = { amountMinor: string; currency: string };
type Address = { recipientName: string; phone: string; line1: string; line2: string | null; division: string; district: string; upazila: string | null; unionName: string | null; postalCode: string | null };
type Payment = { provider?: string; method: string; status: string; amount?: Money; refunded?: Money; transactionId: string | null; createdAt?: string };
type InvoiceItem = { id: string; productName: string; sku: string; quantity: number; unitPrice: Money; lineTotal: Money };
type InvoicePackage = { id: string; vendorName?: string; shopName?: string; status: string; subtotal: Money; discount: Money; delivery: Money; total: Money; commission?: Money; shipment?: { status: string; provider: string | null; trackingNumber: string | null } | null; items: InvoiceItem[] };
export type InvoiceOrder = { orderNumber: string; status: string; createdAt: string; customer?: { displayName: string; email: string | null; phone: string | null }; deliveryAddress?: Address | null; payment?: Payment | null; subtotal: Money; discount: Money; delivery: Money; tax?: Money; total: Money; vendorOrders: InvoicePackage[] };

type Audience = "customer" | "admin";

export function useInvoicePrintStyles(targetId: string) {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const style = document.createElement("style");
    style.textContent = `@media print{body *{visibility:hidden!important}#${targetId},#${targetId} *{visibility:visible!important}#${targetId}{position:absolute!important;inset:0 auto auto 0!important;width:100%!important;border:0!important;box-shadow:none!important;padding:0!important}@page{size:A4;margin:12mm}}`;
    document.head.appendChild(style);
    return () => style.remove();
  }, [targetId]);
}

export function OrderInvoiceDocument({ audience = "customer", invoiceNumber, issuedAt, nativeID, order }: { audience?: Audience; invoiceNumber: string; issuedAt: string; nativeID: string; order: InvoiceOrder }) {
  const address = order.deliveryAddress;
  const itemCount = order.vendorOrders.reduce((sum, vendorOrder) => sum + vendorOrder.items.reduce((items, item) => items + item.quantity, 0), 0);
  const paid = ["CAPTURED", "AUTHORIZED", "PAID"].includes(order.payment?.status ?? "");
  return <View nativeID={nativeID} style={styles.invoice}>
    <Text style={styles.watermark}>AMIYO</Text>
    <View style={styles.hero}>
      <View style={styles.brandBlock}><View style={styles.brand}><View style={styles.mark}><Text style={styles.markText}>A</Text></View><View><Text style={styles.brandName}>Amiyo-Go</Text><Text style={styles.brandSub}>Trusted marketplace invoice</Text></View></View><Text style={styles.company}>Bangladesh commerce platform | support@amiyo-go.com</Text></View>
      <View style={styles.metaBlock}><Text style={styles.invoiceTitle}>INVOICE</Text><Text style={styles.invoiceNumber}>{invoiceNumber}</Text><Text style={styles.heroMeta}>Issued: {date(issuedAt)}</Text><Text style={styles.heroMeta}>Order: {order.orderNumber}</Text></View>
    </View>
    <View style={styles.verificationStrip}><Text style={styles.verified}>Marketplace verified document</Text><Text style={[styles.stamp, paid && styles.stampPaid]}>{paid ? "PAYMENT VERIFIED" : "PAYMENT PENDING"}</Text><Text style={styles.verified}>Generated for {audience === "admin" ? "admin reconciliation" : "customer receipt"}</Text></View>
    <View style={styles.summaryStrip}>
      <Metric label="Status" value={label(order.status)} />
      <Metric label="Packages" value={String(order.vendorOrders.length)} />
      <Metric label="Units" value={String(itemCount)} />
      <Metric label="Total" value={money(order.total)} highlight />
    </View>
    <View style={styles.parties}>
      <View style={styles.party}><Text style={styles.sectionLabel}>BILL TO</Text><Text style={styles.partyName}>{order.customer?.displayName ?? address?.recipientName ?? "Customer"}</Text><Text style={styles.meta}>{order.customer?.email ?? ""}</Text><Text style={styles.meta}>{address?.phone ?? order.customer?.phone ?? ""}</Text><Text style={styles.meta}>{address ? fullAddress(address) : "Delivery address unavailable"}</Text></View>
      <View style={styles.party}><Text style={styles.sectionLabel}>PAYMENT</Text><Info label="Method" value={order.payment ? `${order.payment.method} - ${order.payment.status}` : "Not recorded"} /><Info label="Provider" value={order.payment?.provider ?? "Marketplace"} /><Info label="Transaction" value={order.payment?.transactionId ?? "Pending"} /><Info label="Placed" value={date(order.createdAt)} /></View>
      <View style={styles.qrBox}><Text style={styles.qrCode}>AG</Text><Text style={styles.qrText}>Scan-ready reference</Text><Text style={styles.qrNumber}>{order.orderNumber}</Text></View>
    </View>
    <Text style={styles.sectionTitle}>Store-wise package breakdown</Text>
    <View style={styles.packages}>{order.vendorOrders.map((vendorOrder, index) => <View key={vendorOrder.id} style={styles.package}>
      <View style={styles.packageHead}><View style={styles.packageTitleWrap}><Text style={styles.packageTitle}>{index + 1}. {vendorOrder.shopName ?? "Seller shop"}</Text><Text style={styles.meta}>{vendorOrder.vendorName ? `${vendorOrder.vendorName} | ` : ""}{label(vendorOrder.status)}{vendorOrder.shipment?.trackingNumber ? ` | Tracking ${vendorOrder.shipment.trackingNumber}` : ""}</Text></View><Text style={styles.packageTotal}>{money(vendorOrder.total)}</Text></View>
      <View style={styles.table}><View style={styles.tableHead}><Text style={[styles.headCell, styles.productCell]}>Product</Text><Text style={styles.headCell}>Qty</Text><Text style={styles.headCell}>Unit</Text><Text style={[styles.headCell, styles.right]}>Line total</Text></View>{vendorOrder.items.map((item) => <View key={item.id} style={styles.row}><View style={styles.productCell}><Text style={styles.productName}>{item.productName}</Text><Text style={styles.meta}>{item.sku}</Text></View><Text style={styles.cell}>{item.quantity}</Text><Text style={styles.cell}>{money(item.unitPrice)}</Text><Text style={[styles.cell, styles.right]}>{money(item.lineTotal)}</Text></View>)}</View>
      <View style={styles.packageTotals}><MiniTotal label="Subtotal" value={money(vendorOrder.subtotal)} /><MiniTotal label="Discount" value={`- ${money(vendorOrder.discount)}`} /><MiniTotal label="Delivery" value={money(vendorOrder.delivery)} />{audience === "admin" && vendorOrder.commission ? <MiniTotal label="Commission" value={money(vendorOrder.commission)} /> : null}<MiniTotal label={audience === "admin" && vendorOrder.commission ? "Seller payable" : "Package total"} value={audience === "admin" && vendorOrder.commission ? money({ ...vendorOrder.total, amountMinor: String(Math.max(0, Number(vendorOrder.total.amountMinor) - Number(vendorOrder.commission.amountMinor))) }) : money(vendorOrder.total)} strong /></View>
    </View>)}</View>
    <View style={styles.totals}><InvoiceTotal label="Subtotal" value={money(order.subtotal)} /><InvoiceTotal label="Discount" value={`- ${money(order.discount)}`} /><InvoiceTotal label="Delivery" value={money(order.delivery)} />{order.tax ? <InvoiceTotal label="Tax" value={money(order.tax)} /> : null}<View style={styles.grand}><Text style={styles.grandLabel}>Grand total</Text><Text style={styles.grandValue}>{money(order.total)}</Text></View></View>
    <View style={styles.footer}><Text style={styles.footerTitle}>Thank you for shopping with Amiyo-Go.</Text><Text style={styles.meta}>{audience === "admin" ? "Admin view includes store package split and internal commission amounts for reconciliation." : "This invoice groups products by seller package for transparent delivery and support tracking."}</Text></View>
  </View>;
}

function Metric({ highlight, label, value }: { highlight?: boolean; label: string; value: string }) { return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={[styles.metricValue, highlight && styles.metricHighlight]}>{value}</Text></View>; }
function Info({ label, value }: { label: string; value: string }) { return <View style={styles.info}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>; }
function MiniTotal({ label, strong, value }: { label: string; strong?: boolean; value: string }) { return <View style={styles.miniTotal}><Text style={[styles.miniLabel, strong && styles.strong]}>{label}</Text><Text style={[styles.miniValue, strong && styles.strong]}>{value}</Text></View>; }
function InvoiceTotal({ label, value }: { label: string; value: string }) { return <View style={styles.invoiceTotal}><Text style={styles.totalLabel}>{label}</Text><Text style={styles.totalValue}>{value}</Text></View>; }
function money(value: Money) { return `${value.currency === "BDT" ? "Tk" : value.currency} ${(Number(value.amountMinor) / 100).toLocaleString("en-BD", { minimumFractionDigits: 2 })}`; }
function date(value: string) { return new Date(value).toLocaleString("en-BD", { day: "numeric", month: "short", year: "numeric" }); }
function label(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function fullAddress(address: Address) { return [address.recipientName, address.line1, address.line2, address.unionName, address.upazila, address.district, address.division, address.postalCode].filter(Boolean).join(", "); }

const styles = StyleSheet.create({
  invoice: { alignSelf: "center", backgroundColor: "#fff", borderColor: "#dbe3ea", borderRadius: radius.xl, borderWidth: 1, gap: spacing.lg, maxWidth: 940, overflow: "hidden", padding: 0, position: "relative", width: "100%", ...Platform.select({ web: { boxShadow: "0 24px 70px rgba(15,23,42,.13)" } as never, default: { elevation: 4 } }) },
  watermark: { color: "rgba(30,112,152,.055)", fontFamily: typography.brandFamily, fontSize: 96, position: "absolute", right: 18, top: 130, transform: [{ rotate: "-18deg" }] },
  hero: { alignItems: "flex-start", backgroundColor: "#0f172a", flexDirection: "row", flexWrap: "wrap", gap: spacing.lg, justifyContent: "space-between", padding: 30 },
  brandBlock: { flex: 1, minWidth: 260 },
  brand: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  mark: { alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.md, height: 48, justifyContent: "center", width: 48 },
  markText: { color: "#fff", fontFamily: typography.brandFamily, fontSize: 24 },
  brandName: { color: "#fff", fontFamily: typography.brandFamily, fontSize: 25 },
  brandSub: { color: "#bfdbfe", fontSize: 10, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" },
  company: { color: "#cbd5e1", fontSize: 11, marginTop: spacing.sm },
  metaBlock: { alignItems: "flex-end", minWidth: 180 },
  invoiceTitle: { color: "#fdba74", fontSize: 29, fontWeight: "700", letterSpacing: 2 },
  invoiceNumber: { color: "#fff", fontSize: 13, fontWeight: "700" },
  heroMeta: { color: "#cbd5e1", fontSize: 10, lineHeight: 16 },
  meta: { color: "#64748b", flexShrink: 1, fontSize: 10, lineHeight: 16 },
  verificationStrip: { alignItems: "center", backgroundColor: "#eef6ff", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between", paddingHorizontal: 30, paddingVertical: 10 },
  verified: { color: "#1e3a8a", fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  stamp: { backgroundColor: "#fff7ed", borderColor: "#fed7aa", borderRadius: radius.pill, borderWidth: 1, color: colors.warning, fontSize: 10, fontWeight: "700", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 6 },
  stampPaid: { backgroundColor: "#ecfdf5", borderColor: "#bbf7d0", color: colors.success },
  summaryStrip: { backgroundColor: "#f8fafc", borderColor: "#e2e8f0", borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginHorizontal: 30, marginTop: spacing.lg, padding: spacing.sm },
  metric: { flex: 1, minWidth: 130, padding: spacing.sm },
  metricLabel: { color: "#64748b", fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  metricValue: { color: "#0f172a", fontSize: 16, fontWeight: "700", marginTop: 3 },
  metricHighlight: { color: colors.accent },
  parties: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg, paddingHorizontal: 30 },
  party: { flex: 1, minWidth: 250 },
  qrBox: { alignItems: "center", borderColor: "#cbd5e1", borderRadius: radius.lg, borderStyle: "dashed", borderWidth: 1, gap: 3, justifyContent: "center", minHeight: 112, padding: spacing.md, width: 132 },
  qrCode: { color: "#0f172a", fontFamily: typography.brandFamily, fontSize: 30 },
  qrText: { color: "#64748b", fontSize: 9, textAlign: "center" },
  qrNumber: { color: colors.primary, fontSize: 9, fontWeight: "700", textAlign: "center" },
  sectionLabel: { color: colors.primary, fontSize: 9, fontWeight: "700", letterSpacing: 1.2, marginBottom: spacing.sm, textTransform: "uppercase" },
  partyName: { color: "#0f172a", fontSize: 17, fontWeight: "700" },
  info: { flexDirection: "row", gap: spacing.sm, justifyContent: "space-between", marginBottom: 5 },
  infoLabel: { color: "#64748b", fontSize: 10 },
  infoValue: { color: "#0f172a", flex: 1, fontSize: 10, fontWeight: "600", textAlign: "right" },
  sectionTitle: { color: "#0f172a", fontSize: 18, fontWeight: "700", paddingHorizontal: 30 },
  packages: { gap: spacing.md, paddingHorizontal: 30 },
  package: { borderColor: "#e2e8f0", borderRadius: radius.lg, borderWidth: 1, overflow: "hidden" },
  packageHead: { alignItems: "center", backgroundColor: "#f8fafc", borderBottomColor: "#e2e8f0", borderBottomWidth: 1, borderLeftColor: colors.primary, borderLeftWidth: 4, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between", padding: spacing.md },
  packageTitleWrap: { flex: 1, minWidth: 220 },
  packageTitle: { color: "#0f172a", fontSize: 14, fontWeight: "700" },
  packageTotal: { color: colors.accent, fontSize: 16, fontWeight: "700" },
  table: { minWidth: 0 },
  tableHead: { backgroundColor: "#0f172a", flexDirection: "row", paddingHorizontal: spacing.sm, paddingVertical: 9 },
  headCell: { color: "#fff", fontSize: 9, fontWeight: "700", width: 92 },
  productCell: { flex: 1, minWidth: 170 },
  right: { textAlign: "right" },
  row: { alignItems: "center", borderBottomColor: "#eef2f7", borderBottomWidth: 1, flexDirection: "row", paddingHorizontal: spacing.sm, paddingVertical: 10 },
  productName: { color: "#0f172a", fontSize: 11, fontWeight: "600" },
  cell: { color: "#0f172a", fontSize: 10, width: 92 },
  packageTotals: { alignSelf: "flex-end", gap: 4, minWidth: 260, padding: spacing.md },
  miniTotal: { flexDirection: "row", justifyContent: "space-between" },
  miniLabel: { color: "#64748b", fontSize: 10 },
  miniValue: { color: "#0f172a", fontSize: 10, fontWeight: "600" },
  strong: { color: "#0f172a", fontWeight: "700" },
  totals: { alignSelf: "flex-end", marginHorizontal: 30, minWidth: 300 },
  invoiceTotal: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  totalLabel: { color: "#64748b" },
  totalValue: { color: "#0f172a", fontWeight: "600" },
  grand: { backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm, padding: spacing.md },
  grandLabel: { color: colors.primary, fontWeight: "700", textTransform: "uppercase" },
  grandValue: { color: colors.primary, fontSize: 20, fontWeight: "700" },
  footer: { backgroundColor: "#f8fafc", borderTopColor: "#e2e8f0", borderTopWidth: 1, gap: 4, padding: spacing.lg },
  footerTitle: { color: "#0f172a", fontWeight: "700" }
});
