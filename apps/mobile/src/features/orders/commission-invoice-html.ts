import type { VendorCommissionInvoice } from "@amiyo/contracts";
import { escapeInvoiceText } from "./invoice-html";

export function commissionInvoiceHtml(invoice: VendorCommissionInvoice) {
  const escape = escapeInvoiceText;
  const money = (amount: { amountMinor: string; currency: string }) => {
    const value = BigInt(amount.amountMinor);
    const absolute = value < 0n ? -value : value;
    return `${escape(amount.currency)} ${value < 0n ? "-" : ""}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
  };
  return `<!doctype html><html><head><meta charset="utf-8"><title>Platform commission invoice</title><style>@page{size:A4;margin:15mm}body{font:12px Arial;color:#0B1F3A}header{border-bottom:3px solid #7A1F2B}table{width:100%;border-collapse:collapse}td,th{padding:8px;text-align:left;border-bottom:1px solid #ddd;overflow-wrap:anywhere}tr{break-inside:avoid}thead{display:table-header-group}</style></head><body><header><h1>Amiyo-Go Platform Commission Invoice</h1><p>${escape(invoice.vendorName)} | ${escape(invoice.month)} | Asia/Dhaka</p><p>${escape(invoice.reference)}</p></header><p>Settled commission: ${money(invoice.earned)}<br>Commission reversed: ${money(invoice.reversed)}<br><strong>Net service charge: ${money(invoice.net)}</strong></p><table><thead><tr><th>Posting date</th><th>Entry / reference</th><th>Amount</th></tr></thead><tbody>${invoice.entries.map((entry) => `<tr><td>${escape(new Date(entry.createdAt).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka" }))}</td><td>${escape(entry.kind)}<br>${escape(entry.referenceId)}</td><td>${money(entry.amount)}</td></tr>`).join("")}</tbody></table>${invoice.entries.length ? "" : "<p>No commission postings in this period.</p>"}<p>Based on approved settlement snapshots and posted commission reversals, not order creation dates. Commission is already deducted from seller settlement; do not pay it again. A negative net is a commission adjustment, not an automatic cash payout.</p><p>This is not a statutory VAT/tax invoice. Shipping costs, seller discounts, refund principal and payout transfers are not platform commission. This generated report does not replace a legally issued tax document.</p><p>Generated: ${escape(invoice.generatedAt)}</p></body></html>`;
}
