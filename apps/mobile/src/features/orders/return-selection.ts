import { createReturnSchema, type CreateReturn } from "@amiyo/contracts";

export function buildReturnSelection(packageId: string, available: Array<{ id: string; quantity: number }>, quantities: Record<string, number>, reasonCode: string, reasonDetail: string, refundMethod: CreateReturn["refundMethod"]): CreateReturn {
  const items = Object.entries(quantities).filter(([, quantity]) => quantity !== 0).map(([orderItemId, quantity]) => {
    const item = available.find((entry) => entry.id === orderItemId);
    if (!item || !Number.isInteger(quantity) || quantity < 1 || quantity > item.quantity) throw new Error("Select a valid delivered quantity for each item.");
    return { orderItemId, quantity };
  });
  if (!items.length) throw new Error("Select at least one item to return.");
  return createReturnSchema.parse({ vendorOrderId: packageId, items, reasonCode, reasonDetail: reasonDetail.trim() || null, refundMethod });
}
