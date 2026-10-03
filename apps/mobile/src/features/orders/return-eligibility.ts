import type { OrderDto } from "@amiyo/contracts";

type Eligibility = OrderDto["vendorOrders"][number]["returnEligibility"];
export function returnEligibilityMessage(eligibility: Eligibility, now: number): string | null {
  if (!eligibility) return "Refresh this order to check the return policy.";
  if (eligibility.reason === "NOT_DELIVERED") return "Returns become available after delivery.";
  if (eligibility.reason === "NO_ITEMS") return "All items already have return requests.";
  if (eligibility.reason === "DELIVERY_UNVERIFIED") return "Delivery dates need verification. Contact support.";
  if (eligibility.reason === "POLICY_UNAVAILABLE") return "Return policy is unavailable. Contact support.";
  const deadline = eligibility.deadline ? Date.parse(eligibility.deadline) : NaN;
  if (!Number.isFinite(deadline)) return "Return deadline needs verification. Contact support.";
  if (eligibility.reason === "EXPIRED" || now >= deadline) return "The return window has ended. Contact support to request an exception.";
  return null;
}
