import { useRef, useState } from "react";
import { Platform, Pressable, Text } from "react-native";
import { useCurrentUser } from "../auth/use-current-user";
import { colors, spacing } from "../../ui/tokens";
import { getScannerBarcode } from "./orders.api";
import { shareDocumentPdf } from "./document-export";
import { scannerBarcodeHtml } from "./scanner-barcode-html";

export function ScannerBarcodeExport({ id }: { id: string }) {
  const user = useCurrentUser();
  const active = useRef(user?.uid); active.current = user?.uid;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function print() {
    if (!user || busy) return;
    setBusy(true); setError("");
    try {
      const barcode = await getScannerBarcode(user, id);
      if (active.current !== user.uid) return;
      await shareDocumentPdf(scannerBarcodeHtml(barcode.parcelId, barcode.pngBase64), "Amiyo scanner barcode", "parcel");
    } catch (failure) { if (active.current === user.uid) setError(failure instanceof Error ? failure.message : "Barcode export failed"); }
    finally { setBusy(false); }
  }
  return <><Pressable accessibilityRole="button" disabled={!user || busy} onPress={print} style={{ backgroundColor: colors.primary, borderRadius: 10, padding: spacing.md, minHeight: 44 }}><Text style={{ color: colors.onPrimary }}>{busy ? "Preparing barcode…" : Platform.OS === "web" ? "Print / Save scanner barcode PDF" : "Share scanner barcode PDF"}</Text></Pressable>{error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}</>;
}
