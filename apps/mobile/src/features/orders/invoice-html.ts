import type { InvoiceOrder } from "./components/OrderInvoiceDocument";

export function escapeInvoiceText(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

function amount(value: { amountMinor: string; currency: string }) {
  const minor = BigInt(value.amountMinor);
  return `${escapeInvoiceText(value.currency)} ${minor / 100n}.${(minor % 100n).toString().padStart(2, "0")}`;
}

export function invoiceHtml(order: InvoiceOrder, number: string, issuedAt: string, qrImage?: string, admin = false) {
  const address = order.deliveryAddress;
  const packages = order.vendorOrders.map((parcel) => `<section><h2>${escapeInvoiceText(parcel.shopName ?? "Seller package")}</h2><table><thead><tr><th>Product / SKU</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead><tbody>${parcel.items.map((item) => `<tr><td>${escapeInvoiceText(item.productName)}<br><small>${escapeInvoiceText(item.sku)}</small></td><td>${item.quantity}</td><td>${amount(item.unitPrice)}</td><td>${amount(item.lineTotal)}</td></tr>`).join("")}</tbody></table><p>Subtotal: ${amount(parcel.subtotal)} · Discount: ${amount(parcel.discount)} · Delivery: ${amount(parcel.delivery)}</p><p>Package total: ${amount(parcel.total)}</p>${admin && parcel.commission ? `<p>Commission: ${amount(parcel.commission)}</p>` : ""}</section>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:14mm}body{font-family:Arial,sans-serif;color:#0B1F3A;font-size:12px}header{background:#0B1F3A;color:white;padding:24px}h1{margin:0}h2{font-size:17px}section{margin:20px 0}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:10px;border-bottom:1px solid #ddd}tr{break-inside:avoid}thead{display:table-header-group}.total{font-size:20px;color:#7A1F2B}.qr{width:160px;height:160px}small{color:#555}</style></head><body><header><h1>Amiyo-Go Invoice</h1><p>${escapeInvoiceText(number)} · ${escapeInvoiceText(issuedAt)}</p></header><p>Order: ${escapeInvoiceText(order.orderNumber)}</p><p>Payment: ${escapeInvoiceText(order.payment?.method ?? "Not recorded")} / ${escapeInvoiceText(order.payment?.status ?? "PENDING")}</p><p>${[address?.recipientName ?? order.customer?.displayName, address?.phone, address?.line1, address?.line2, address?.unionName, address?.upazila, address?.district, address?.division].filter(Boolean).map((value) => escapeInvoiceText(value!)).join("<br>")}</p>${qrImage && /^[A-Za-z0-9+/=\r\n]+$/.test(qrImage) ? `<img class="qr" alt="Signed invoice QR" src="data:image/png;base64,${qrImage}">` : ""}${packages}<p>Subtotal: ${amount(order.subtotal)}</p><p>Discount: ${amount(order.discount)}</p><p>Delivery: ${amount(order.delivery)}</p>${order.tax ? `<p>Tax: ${amount(order.tax)}</p>` : ""}<p class="total">Grand total: ${amount(order.total)}</p><footer>Keep this invoice for order support and returns.</footer></body></html>`;
}
