import type { VendorStatement } from "@amiyo/contracts";
import { escapeInvoiceText } from "./invoice-html";

export function statementHtml(statement: VendorStatement) {
  const escape = escapeInvoiceText;
  const money = (amount: { amountMinor: string; currency: string }) => {
    const value = BigInt(amount.amountMinor);
    const absolute = value < 0n ? -value : value;
    return `${escape(amount.currency)} ${value < 0n ? "-" : ""}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
  };
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:15mm}body{font:12px Arial;color:#0B1F3A}header{border-bottom:3px solid #7A1F2B}table{width:100%;border-collapse:collapse}td,th{padding:7px;text-align:left;border-bottom:1px solid #ddd;overflow-wrap:anywhere}tr{break-inside:avoid}thead{display:table-header-group}h1{font-size:24px}</style></head><body><header><h1>Amiyo-Go Seller Statement</h1><p>${escape(statement.vendorName)} · ${escape(statement.month)} · Asia/Dhaka</p></header><p>Opening: ${money(statement.opening)} | Credits: ${money(statement.credits)} | Debits: ${money(statement.debits)} | Closing: ${money(statement.closing)}</p><table><thead><tr><th>Date</th><th>Entry / Reference</th><th>Direction</th><th>Amount</th></tr></thead><tbody>${statement.entries.map((entry) => `<tr><td>${escape(new Date(entry.createdAt).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka" }))}</td><td>${escape(entry.entryType)}<br>${escape(entry.referenceType)}: ${escape(entry.referenceId)}</td><td>${escape(entry.direction)}</td><td>${money(entry.amount)}</td></tr>`).join("")}</tbody></table>${statement.entries.length ? "" : "<p>No ledger entries in this period.</p>"}<p>Generated: ${escape(statement.generatedAt)}</p><p>This ledger statement includes wallet credits, debits and payout reservations. It is not a tax invoice or a promise of immediate payout.</p></body></html>`;
}
