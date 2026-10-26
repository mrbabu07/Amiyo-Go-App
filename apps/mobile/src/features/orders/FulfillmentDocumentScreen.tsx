import { useQuery } from "@tanstack/react-query";
import { Link, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { DocumentQrCode } from "../../ui/DocumentQrCode";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing, typography } from "../../ui/tokens";
import { formatMinor } from "../../ui/money";
import { useCurrentUser } from "../auth/use-current-user";
import { getFulfillmentDocument } from "./orders.api";
import { captureDocumentQr, shareDocumentPdf, type DocumentQrRef } from "./document-export";
import { fulfillmentHtml } from "./fulfillment-html";

const printId = "vendor-parcel-label";
const money = (value: { amountMinor: string; currency: string }) => formatMinor(value.amountMinor, value.currency, 2).replace(/^৳/, "Tk ");

export function FulfillmentDocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useCurrentUser();
  const document = useQuery({ queryKey: ["vendor", "fulfillment-document", id, user?.uid], queryFn: () => getFulfillmentDocument(user!, id), enabled: Boolean(user && id) });
  const qr = useRef<DocumentQrRef | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const print = async (kind: "parcel" | "packing" = "parcel") => {
    if (!document.data || exporting) return;
    setExporting(true);
    setExportError("");
    try {
      const qrImage = await captureDocumentQr(qr.current, printId);
      await shareDocumentPdf(fulfillmentHtml(document.data, qrImage, kind), `${kind} ${document.data.parcelId}`, kind === "parcel" ? "parcel" : "a4");
    } catch (error) { setExportError(error instanceof Error ? error.message : "Could not export document."); }
    finally { setExporting(false); }
  };
  if (document.isLoading) return <Screen title="Packing slip"><ActivityIndicator color={colors.primary} /></Screen>;
  const data = document.data;
  return <Screen eyebrow="AMIYO-GO FULFILLMENT" title={data ? `Order ${data.orderNumber}` : "Packing slip"} description="Print the signed thermal parcel label and attach it securely to the matching seller package.">
    {document.error ? <Text style={styles.error}>{document.error.message}</Text> : null}
    {exportError ? <Text accessibilityRole="alert" style={styles.error}>{exportError}</Text> : null}
    <Link href="/verify-document">Scan or verify a parcel QR</Link>
    {data ? <>
      <View nativeID={printId} style={styles.label}>
        <View style={styles.labelHead}><View><Text style={styles.brand}>Amiyo-Go</Text><Text style={styles.kicker}>SIGNED MARKETPLACE PARCEL</Text></View><Text style={styles.status}>{data.status.replaceAll("_", " ")}</Text></View>
        <Text style={styles.parcel}>{data.parcelId}</Text>
        <View style={styles.divider} />
        <View style={styles.routeRow}>
          <View style={styles.route}><Text style={styles.kicker}>DELIVER TO</Text><Text style={styles.customer}>{data.customer.name}</Text><Text style={styles.strong}>{data.customer.phone}</Text><Text style={styles.address}>{data.customer.address}</Text></View>
          <DocumentQrCode getRef={(ref) => { qr.current = ref; }} label="Scan to verify package" reference={data.trackingNumber || data.parcelId} size={150} value={data.qrPayload} />
        </View>
        <View style={styles.meta}><Cell label="PAYMENT" value={data.payment.method} /><Cell label="COLLECT" value={money(data.payment.collectAmount)} /><Cell label="UNITS" value={String(data.items.reduce((sum, item) => sum + item.quantity, 0))} /><Cell label="TRACKING" value={data.trackingNumber || "At pickup"} /></View>
        <View style={styles.pickup}><Text style={styles.kicker}>PICKUP FROM</Text><Text style={styles.strong}>{data.pickup.name}</Text><Text style={styles.address}>{[data.pickup.phone, data.pickup.address].filter(Boolean).join(" · ")}</Text></View>
        <Text style={styles.signed}>HMAC signed · Expires {new Date(data.qrExpiresAt).toLocaleDateString("en-BD")}</Text>
      </View>
      <ModuleCard title="Items to pack" meta={`${data.items.length} product lines`}>{data.items.map((item) => <View key={item.id} style={styles.row}><View style={styles.flex}><Text style={styles.strong}>{item.name}</Text><Text style={styles.muted}>{item.sku} · Qty {item.quantity}</Text></View><Text style={styles.strong}>{money(item.lineTotal)}</Text></View>)}</ModuleCard>
      <ModuleCard title="Order summary"><Row label="Subtotal" value={money(data.subtotal)} /><Row label="Discount" value={`-${money(data.discount)}`} /><Row label="Delivery" value={money(data.delivery)} /><View style={styles.divider} /><Row label="Total" value={money(data.total)} /></ModuleCard>
      <ModuleCard title="Packing checklist"><Text>☐ Items verified   ☐ Condition checked</Text><Text>☐ Packing slip included   ☐ Package sealed</Text><Text>☐ Signed parcel label attached   ☐ Tracking recorded</Text></ModuleCard>
      <Pressable accessibilityRole="button" disabled={exporting} onPress={() => print()} style={styles.button}><Text style={styles.buttonText}>{exporting ? "Preparing PDF…" : Platform.OS === "web" ? "Print 100 × 150 mm parcel label" : "Share parcel label PDF"}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={exporting} onPress={() => print("packing")} style={styles.button}><Text style={styles.buttonText}>{Platform.OS === "web" ? "Print / Save packing slip PDF" : "Share packing slip PDF"}</Text></Pressable>
    </> : null}
  </Screen>;
}

function Cell({ label, value }: { label: string; value: string }) { return <View style={styles.cell}><Text style={styles.kicker}>{label}</Text><Text numberOfLines={2} style={styles.strong}>{value}</Text></View>; }
function Row({ label, value }: { label: string; value: string }) { return <View style={styles.row}><Text style={styles.muted}>{label}</Text><Text style={styles.strong}>{value}</Text></View>; }

const styles = StyleSheet.create({
  label: { alignSelf: "center", backgroundColor: "#fff", borderColor: "#050B14", borderRadius: radius.md, borderWidth: 2, gap: spacing.sm, maxWidth: 400, minHeight: 566, padding: spacing.lg, width: "100%", ...Platform.select({ web: { boxShadow: "0 18px 48px rgba(11,31,58,.12)" } as never, default: { elevation: 3 } }) },
  labelHead: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  brand: { color: "#050B14", fontFamily: typography.brandFamily, fontSize: 24 },
  parcel: { color: "#050B14", fontFamily: "monospace", fontSize: 13, fontWeight: "700" },
  status: { borderColor: "#050B14", borderRadius: radius.sm, borderWidth: 1, color: "#050B14", fontSize: 10, fontWeight: "700", padding: spacing.sm },
  divider: { backgroundColor: "#050B14", height: 1 },
  kicker: { color: "#4b5563", fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  customer: { color: "#050B14", fontFamily: typography.serifFamily, fontSize: 22, fontWeight: "600" },
  strong: { color: "#050B14", fontWeight: "700" },
  address: { color: "#111827", fontSize: 12, lineHeight: 18 },
  routeRow: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between" },
  route: { flex: 1, gap: spacing.xs, minWidth: 170 },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  cell: { borderColor: "#050B14", borderWidth: 1, flexBasis: 150, flexGrow: 1, gap: 2, minHeight: 52, padding: spacing.sm },
  pickup: { backgroundColor: colors.background, gap: 2, padding: spacing.sm },
  signed: { color: colors.success, fontSize: 9, fontWeight: "700", textAlign: "center" },
  row: { flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  flex: { flex: 1 },
  muted: { color: colors.muted },
  button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 48 },
  buttonText: { color: colors.onPrimary, fontWeight: "700" },
  error: { color: colors.danger }
});
