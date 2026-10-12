import type { OrderDto } from "@amiyo/contracts";
import { returnEligibilityMessage } from "./return-eligibility";

export function returnActionState(order: OrderDto, now: number) {
  if (order.vendorOrders.some((vendorOrder) => returnEligibilityMessage(vendorOrder.returnEligibility, now) === null)) {
    return { available: true, message: null } as const;
  }
  const messages = [...new Set(order.vendorOrders.map((vendorOrder) => returnEligibilityMessage(vendorOrder.returnEligibility, now)).filter((message): message is string => Boolean(message)))];
  return { available: false, message: messages.join(" ") || "Refresh this order to check return availability." } as const;
}
