import type { OrderDto } from "@amiyo/contracts";

export function orderSupportDraft(order: Pick<OrderDto, "id" | "orderNumber" | "status">) {
  return {
    orderId: order.id,
    category: "ORDER" as const,
    priority: "normal" as const,
    subject: `Help with order ${order.orderNumber}`,
    message: `I need help with this order.\nOrder number: ${order.orderNumber}\nOrder ID: ${order.id}\nCurrent status: ${order.status}\n\nIssue details: `
  };
}

export function validOrderContext(value?: string) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
