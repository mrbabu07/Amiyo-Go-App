import { customerOrderSummarySchema, fulfillmentDocumentSchema, invoiceSchema, orderTrackingSchema, vendorOrderDetailSchema, type VendorOrderTransition } from "@amiyo/contracts";
import type { User } from "firebase/auth";

const apiUrl = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
async function request(user: User, path: string, init?: RequestInit) { const token = await user.getIdToken(); const response = await fetch(`${apiUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers } }); if (!response.ok) { const problem = await response.json().catch(() => null) as { title?: string; detail?: string } | null; throw new Error(problem?.detail || problem?.title || `Order request failed (${response.status})`); } return response.json() as Promise<unknown>; }
export async function getCustomerOrders(user: User) { return customerOrderSummarySchema.array().parse(await request(user, "/api/v2/orders")); }
export async function getOrderTracking(user: User, id: string) { return orderTrackingSchema.parse(await request(user, `/api/v2/orders/${id}/tracking`)); }
export async function getVendorOrders(user: User) { return vendorOrderDetailSchema.array().parse(await request(user, "/api/v2/vendor/orders")); }
export async function getVendorOrder(user: User, id: string) { return vendorOrderDetailSchema.parse(await request(user, `/api/v2/vendor/orders/${id}`)); }
export async function transitionVendorOrder(user: User, id: string, input: VendorOrderTransition, key: string) { return vendorOrderDetailSchema.parse(await request(user, `/api/v2/vendor/orders/${id}/transitions`, { method: "POST", headers: { "Idempotency-Key": key }, body: JSON.stringify(input) })); }
export async function getInvoice(user: User, id: string) { return invoiceSchema.parse(await request(user, `/api/v2/orders/${id}/invoice`)); }
export async function getFulfillmentDocument(user: User, id: string) { return fulfillmentDocumentSchema.parse(await request(user, `/api/v2/vendor/orders/${id}/documents`)); }
