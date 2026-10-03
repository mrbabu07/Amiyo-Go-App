import { createReturnSchema, type CreateReturn } from "@amiyo/contracts";

export function remainingReturnQuantity(item: { quantity: number; returnableQuantity?: number }) {
  return Math.max(0, Math.min(item.quantity, item.returnableQuantity ?? item.quantity));
}

export function buildReturnSelection(packageId: string, available: Array<{ id: string; quantity: number; returnableQuantity?: number }>, quantities: Record<string, number>, reasonCode: string, reasonDetail: string, refundMethod: CreateReturn["refundMethod"]): CreateReturn {
  const items = Object.entries(quantities).filter(([, quantity]) => quantity !== 0).map(([orderItemId, quantity]) => {
    const item = available.find((entry) => entry.id === orderItemId);
    if (!item || !Number.isInteger(quantity) || quantity < 1 || quantity > remainingReturnQuantity(item)) throw new Error("Select a quantity within the remaining return allowance.");
    return { orderItemId, quantity };
  });
  if (!items.length) throw new Error("Select at least one item to return.");
  return createReturnSchema.parse({ vendorOrderId: packageId, items, reasonCode, reasonDetail: reasonDetail.trim() || null, refundMethod });
}
