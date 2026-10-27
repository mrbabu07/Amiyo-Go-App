import bwipjs from "bwip-js";

export async function scannerBarcode(parcelId: string) {
  if (!/^[A-Za-z0-9-]{1,80}$/.test(parcelId)) throw new Error("Invalid parcel identifier");
  const png = await bwipjs.toBuffer({ bcid: "code128", text: parcelId, scale: 3, height: 15, includetext: true, textxalign: "center", paddingwidth: 12, paddingheight: 8, backgroundcolor: "FFFFFF" });
  return { parcelId, pngBase64: png.toString("base64") };
}
