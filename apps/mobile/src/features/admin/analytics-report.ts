import type { AdminAnalyticsDto } from "@amiyo/contracts";

const cell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

export function buildAdminAnalyticsCsv(report: AdminAnalyticsDto) {
  const rows: Array<Array<string | number>> = [["section", "date_or_name", "orders_or_units", "customers", "revenue_minor", "currency"]];
  rows.push(["summary", "GMV", report.summary.orders, report.summary.purchasingCustomers, report.summary.gmv.amountMinor, report.summary.gmv.currency]);
  rows.push(["summary", "Average order value", report.summary.orders, report.summary.newCustomers, report.summary.averageOrderValue.amountMinor, report.summary.averageOrderValue.currency]);
  report.trend.forEach((item) => rows.push(["daily_trend", item.date, item.orders, "", item.revenue.amountMinor, item.revenue.currency]));
  report.segments.forEach((item) => rows.push(["customer_segment", item.key, item.orders, item.customers, item.revenue.amountMinor, item.revenue.currency]));
  report.topProducts.forEach((item) => rows.push(["top_product", item.name, item.quantity, "", item.revenue.amountMinor, item.revenue.currency]));
  report.topVendors.forEach((item) => rows.push(["top_vendor", item.name, item.orders, "", item.revenue.amountMinor, item.revenue.currency]));
  return `${rows.map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;
}
