export function scannerBarcodeHtml(parcelId: string, pngBase64: string) {
  if (!/^[A-Za-z0-9-]{1,80}$/.test(parcelId) || !/^[A-Za-z0-9+/]+={0,2}$/.test(pngBase64)) throw new Error("Invalid scanner barcode");
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:100mm 150mm;margin:8mm}body{font:14px Arial;color:#111;text-align:center}img{width:100%;height:auto}h1{font-size:22px}</style></head><body><h1>Amiyo-Go scanner barcode</h1><p>${parcelId}</p><img alt="Code 128 parcel identifier" src="data:image/png;base64,${pngBase64}"><p>Package identification only. Use the signed parcel QR for secure verification.</p></body></html>`;
}
