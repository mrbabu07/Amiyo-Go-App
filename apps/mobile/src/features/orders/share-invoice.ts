import { captureDocumentQr, shareDocumentPdf, type DocumentQrRef } from "./document-export";
import { Platform } from "react-native";
import type { InvoiceOrder } from "./components/OrderInvoiceDocument";
import { invoiceHtml } from "./invoice-html";

export type InvoiceQrRef = DocumentQrRef;

export async function shareInvoice(order: InvoiceOrder, number: string, issuedAt: string, qr: InvoiceQrRef | null, admin = false) {
  if (Platform.OS === "web") { window.print(); return; }
  const qrImage = await captureDocumentQr(qr);
  const html = invoiceHtml(order, number, issuedAt, qrImage, admin);
  await shareDocumentPdf(html, number);
}
