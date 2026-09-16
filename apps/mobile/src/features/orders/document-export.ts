import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

export type DocumentQrRef = { toDataURL: (callback: (data: string) => void) => void };

export function captureDocumentQr(qr: DocumentQrRef | null): Promise<string> {
  if (!qr) return Promise.reject(new Error("The document QR is still loading. Please try again."));
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Could not render the document QR. Please try again.")), 5000);
    try {
      qr.toDataURL((data) => {
        clearTimeout(timeout);
        if (!data || !/^[A-Za-z0-9+/=\r\n]+$/.test(data)) { reject(new Error("Could not render a valid document QR.")); return; }
        resolve(data);
      });
    } catch (error) { clearTimeout(timeout); reject(error); }
  });
}

export async function shareDocumentPdf(html: string, title: string, page: "a4" | "parcel" = "a4") {
  const dimensions = page === "parcel" ? { width: 283.46, height: 425.20 } : { width: 595.28, height: 841.89 };
  if (!await Sharing.isAvailableAsync()) { await Print.printAsync({ html, ...dimensions }); return; }
  const file = await Print.printToFileAsync({ html, ...dimensions });
  await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: title });
}
