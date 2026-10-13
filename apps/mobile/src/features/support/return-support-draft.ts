import type { ReturnDto } from "@amiyo/contracts";

export function returnSupportDraft(item: Pick<ReturnDto, "id" | "orderId" | "status" | "reasonCode" | "reasonDetail">) {
  return {
    returnId: item.id,
    orderId: item.orderId,
    category: "RETURN" as const,
    priority: "high" as const,
    subject: `Review return #${item.id.slice(0, 8).toUpperCase()}`,
    message: `Please review my return request.\nReturn ID: ${item.id}\nOrder ID: ${item.orderId}\nCurrent status: ${item.status}\nReason: ${item.reasonCode}${item.reasonDetail ? `\nDetails: ${item.reasonDetail}` : ""}`
  };
}

export function validReturnContext(value?: string) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
