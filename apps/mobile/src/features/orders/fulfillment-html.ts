import type { FulfillmentDocument } from "@amiyo/contracts";
import { escapeInvoiceText } from "./invoice-html";

function money(value: { amountMinor: string; currency: string }) {
  const minor = BigInt(value.amountMinor);
  return `${escapeInvoiceText(value.currency)} ${minor / 100n}.${(minor % 100n).toString().padStart(2, "0")}`;
}

export function fulfillmentHtml(data: FulfillmentDocument, qrImage: string, kind: "parcel" | "packing") {
  if (!qrImage || !/^[A-Za-z0-9+/=\r\n]+$/.test(qrImage)) throw new Error("A rendered QR is required for fulfillment documents.");
  const text = escapeInvoiceText;
  const items = kind === "packing" ? `<h2>Items to pack</h2><table><thead><tr><th>Product / SKU</th><th>Qty</th><th>Total</th></tr></thead><tbody>${data.items.map((item) => `<tr><td>${text(item.name)}<br>${text(item.sku)}</td><td>${item.quantity}</td><td>${money(item.lineTotal)}</td></tr>`).join("")}</tbody></table><p>Subtotal: ${money(data.subtotal)}</p><p>Discount: ${money(data.discount)}</p><p>Delivery: ${money(data.delivery)}</p><p>Total: ${money(data.total)}</p><p>Check items, condition, quantities and seal before dispatch.</p>` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:${kind === "parcel" ? "100mm 150mm" : "A4"};margin:6mm}body{margin:0;font:11px Arial,sans-serif;color:#111}h1{font-size:20px;margin:0 0 6px}h2{font-size:14px}p{margin:5px 0;overflow-wrap:anywhere}.qr{width:36mm;height:36mm}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:7px;border-bottom:1px solid #ccc}tr{break-inside:avoid}thead{display:table-header-group}.collect{font-size:16px;font-weight:bold}.address{line-height:1.4}</style></head><body><h1>Amiyo-Go ${kind === "parcel" ? "Parcel" : "Packing Slip"}</h1><p>${text(data.parcelId)}</p><p>Order: ${text(data.orderNumber)} / ${text(data.shopName)}</p><img class="qr" alt="Signed parcel QR" src="data:image/png;base64,${qrImage}"><p>Tracking: ${text(data.trackingNumber ?? "Awaiting pickup")}</p><h2>Deliver to</h2><p>${text(data.customer.name)} / ${text(data.customer.phone)}</p><p class="address">${text(data.customer.address)}</p><p class="collect">Collect: ${money(data.payment.collectAmount)}</p><p>Payment method: ${text(data.payment.method)}</p><h2>Pickup from</h2><p>${text(data.pickup.name)} / ${text(data.pickup.phone)}</p><p class="address">${text(data.pickup.address)}</p><p>Units: ${data.items.reduce((total, item) => total + item.quantity, 0)}</p>${items}<p>QR expiry: ${text(data.qrExpiresAt)}</p></body></html>`;
}
