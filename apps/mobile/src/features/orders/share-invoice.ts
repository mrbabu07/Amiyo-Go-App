import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import type { InvoiceOrder } from "./components/OrderInvoiceDocument";
import { invoiceHtml } from "./invoice-html";

export type InvoiceQrRef = { toDataURL: (callback: (data: string) => void) => void };

export async function shareInvoice(order: InvoiceOrder, number: string, issuedAt: string, qr: InvoiceQrRef | null, admin = false) {
  if (Platform.OS === "web") { window.print(); return; }
  const qrImage = qr ? await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Invoice QR is not ready. Please try again.")), 5000);
    qr.toDataURL((data) => { clearTimeout(timeout); resolve(data); });
  }) : undefined;
  const html = invoiceHtml(order, number, issuedAt, qrImage, admin);
  if (!await Sharing.isAvailableAsync()) { await Print.printAsync({ html }); return; }
  const file = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: number });
}
