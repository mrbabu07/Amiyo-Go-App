import type { FulfillmentDocument } from "@amiyo/contracts";
import type { User } from "@firebase/auth";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { DocumentQrCode } from "../../ui/DocumentQrCode";
import { colors, spacing } from "../../ui/tokens";
import { loadBatchDocuments, batchFulfillmentHtml } from "./batch-documents";
import { captureDocumentQr, shareDocumentPdf, type DocumentQrRef } from "./document-export";
import { getFulfillmentDocument } from "./orders.api";

const printId = "batch-fulfillment-documents";
const money = (value: { amountMinor: string; currency: string }) => `${value.currency} ${BigInt(value.amountMinor) / 100n}.${(BigInt(value.amountMinor) % 100n).toString().padStart(2, "0")}`;

export function BatchDocuments({ ids, user }: { ids: string[]; user: User }) {
  const [documents, setDocuments] = useState<FulfillmentDocument[]>([]);
  const [kind, setKind] = useState<"parcel" | "packing">("parcel");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refs = useRef<Record<string, DocumentQrRef>>({});
  const selection = ids.join(",");
  useEffect(() => { setDocuments([]); refs.current = {}; }, [selection]);
  const prepare = async (nextKind: "parcel" | "packing") => {
    setBusy(true); setError(""); setDocuments([]); refs.current = {};
    try { const loaded = await loadBatchDocuments(ids, (id) => getFulfillmentDocument(user, id)); setKind(nextKind); setDocuments(loaded); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not prepare every package. Retry the batch."); }
    finally { setBusy(false); }
  };
  const print = async () => {
    setBusy(true); setError("");
    try {
      const images = await Promise.all(documents.map((document) => captureDocumentQr(refs.current[document.vendorOrderId] ?? null, `${printId}-${document.vendorOrderId}`)));
      await shareDocumentPdf(batchFulfillmentHtml(documents, images, kind), "Amiyo-Go package batch", kind === "parcel" ? "parcel" : "a4");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not export batch."); }
    finally { setBusy(false); }
  };
  return <View style={styles.wrap}>
    <Text style={styles.text}>{ids.length} packages selected (maximum 20)</Text>
    <View style={styles.actions}>{(["parcel", "packing"] as const).map((option) => <Pressable key={option} accessibilityRole="button" disabled={busy || !ids.length} onPress={() => prepare(option)} style={styles.button}><Text style={styles.buttonText}>{option === "parcel" ? "Prepare labels" : "Prepare packing slips"}</Text></Pressable>)}</View>
    {busy ? <Text accessibilityLiveRegion="polite" style={styles.text}>Preparing documents…</Text> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {documents.length ? <>
      <Pressable accessibilityRole="button" disabled={busy} onPress={print} style={styles.button}><Text style={styles.buttonText}>{Platform.OS === "web" ? "Print / Save PDF" : "Share batch PDF"} ({documents.length})</Text></Pressable>
      <View nativeID={printId}>{documents.map((document) => <View key={document.vendorOrderId} nativeID={`${printId}-${document.vendorOrderId}`} style={styles.page}>
        <Text style={styles.heading}>Amiyo-Go {kind === "parcel" ? "Parcel" : "Packing Slip"}</Text>
        <Text style={styles.ink}>{document.orderNumber} / {document.shopName}</Text>
        <DocumentQrCode value={document.qrPayload} reference={document.parcelId} label="Signed parcel QR" getRef={(ref) => { refs.current[document.vendorOrderId] = ref; }} />
        <Text style={styles.ink}>Deliver to: {document.customer.name} · {document.customer.phone}</Text>
        <Text style={styles.ink}>{document.customer.address}</Text>
        <Text style={styles.heading}>Collect: {money(document.payment.collectAmount)}</Text>
        <Text style={styles.ink}>{document.payment.method} · Tracking: {document.trackingNumber || "Awaiting pickup"}</Text>
        <Text style={styles.ink}>Pickup: {document.pickup.name} · {document.pickup.phone}</Text>
        <Text style={styles.ink}>{document.pickup.address}</Text>
        {kind === "packing" ? <>{document.items.map((item) => <Text key={item.id} style={styles.ink}>{item.name} / {item.sku} · Qty {item.quantity} · {money(item.lineTotal)}</Text>)}<Text style={styles.ink}>Subtotal {money(document.subtotal)} · Discount {money(document.discount)} · Delivery {money(document.delivery)}</Text><Text style={styles.heading}>Total: {money(document.total)}</Text></> : null}
        <Text style={styles.ink}>QR expiry: {document.qrExpiresAt}</Text>
      </View>)}</View>
    </> : null}
  </View>;
}

const styles = StyleSheet.create({ wrap: { gap: spacing.sm }, actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, button: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: 10, minHeight: 44 }, buttonText: { color: "#fff", fontWeight: "600" }, text: { color: colors.text }, error: { color: colors.danger }, page: { backgroundColor: "#fff", padding: spacing.md, gap: spacing.sm, marginBottom: spacing.md }, ink: { color: "#111", fontSize: 12 }, heading: { color: "#111", fontSize: 16, fontWeight: "700" } });
