import type { User } from "firebase/auth";

const apiUrl = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
export type LogisticsShipment = { id: string; orderId: string; orderNumber: string; vendorName: string; shopName: string; status: string; provider: string | null; trackingNumber: string | null; totalMinor: string; currency: string; codAmountMinor: string; updatedAt: string; assignment: { id: string; version: number; courierPartnerId: string | null; pickupStaffId: string | null; pickupWindow: string | null; courierPartner?: { name: string } | null; pickupStaff?: { name: string } | null } | null; failedDelivery: { reason: string; attemptCount: number; resolution: string; nextAttemptAt: string | null } | null };
export type LogisticsOverview = {
  summary: { totalShipments: number; readyToShip: number; activeParcels: number; failedDeliveries: number; codOutstandingMinor: string };
  zones: Array<{ id: string; name: string; code: string; districts: string[]; status: string; slaHours: number; codAvailable: boolean }>;
  couriers: Array<{ id: string; name: string; code: string; status: string; provider: string; codSupported: boolean; baseDeliveryCostMinor: string }>;
  pickupStaff: Array<{ id: string; name: string; phone: string | null; routeName: string | null; status: string; vehicleType: string; capacityOrders: number }>;
  feeRules: Array<{ id: string; name: string; ruleType: string; status: string; zoneCode: string | null; baseFeeMinor: string; codFeeMinor: string; redeliveryFeeMinor: string }>;
  shipments: LogisticsShipment[];
  remittances: Array<{ id: string; courierName: string; collectedAmountMinor: string; remittedAmountMinor: string; forwardedToVendorMinor: string; reference: string | null; createdAt: string }>;
};

export async function logisticsRequest<T>(user: User, path = "/overview", init?: RequestInit) {
  const token = await user.getIdToken();
  const response = await fetch(`${apiUrl}/api/v2/admin/logistics${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) { const problem = await response.json().catch(() => null) as { detail?: string; title?: string } | null; throw new Error(problem?.detail || problem?.title || `Logistics request failed (${response.status})`); }
  return response.json() as Promise<T>;
}
export const getLogisticsOverview = (user: User) => logisticsRequest<LogisticsOverview>(user);
export const saveLogisticsResource = (user: User, path: string, body: unknown, method = "POST") => logisticsRequest(user, path, { method, body: JSON.stringify(body) });
