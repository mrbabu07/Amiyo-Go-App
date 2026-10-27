type ExportOrder = {
  id: string; orderNumber: string; shopName: string; createdAt: string; status: string;
  customer: { displayName: string }; total: { amountMinor: string; currency: string };
  payment?: { method: string; status: string } | null;
  items: Array<{ productName: string; quantity: number }>;
};

function cell(value: string | number) {
  const text = String(value);
  const safe = /^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function vendorOrdersCsv(orders: ExportOrder[]) {
  const unique = [...new Map(orders.map((order) => [order.id, order])).values()];
  const rows: Array<Array<string | number>> = [["Package ID", "Order", "Store", "Created", "Status", "Customer", "Products", "Units", "Package total minor", "Currency", "Payment method", "Payment status"]];
  for (const order of unique) rows.push([order.id, order.orderNumber, order.shopName, order.createdAt, order.status, order.customer.displayName, order.items.map((item) => `${item.productName} × ${item.quantity}`).join("; "), order.items.reduce((sum, item) => sum + item.quantity, 0), order.total.amountMinor, order.total.currency, order.payment?.method ?? "UNKNOWN", order.payment?.status ?? "UNKNOWN"]);
  return `\uFEFF${rows.map((row) => row.map(cell).join(",")).join("\r\n")}`;
}
