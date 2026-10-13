import { chatThreadCreatedSchema, customerOrderSummarySchema, documentQrVerificationSchema, fulfillmentDocumentSchema, invoiceSchema, orderSchema, orderTrackingSchema, vendorOrderDetailSchema, type VendorOrderTransition } from "@amiyo/contracts";
import type { User } from "firebase/auth";
import { withReadDeadline } from "../../network/request-deadline";

const apiUrl = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
async function request(user: User, path: string, init?: RequestInit) { return withReadDeadline(init?.method, async (signal) => { const token = await user.getIdToken(); if (signal?.aborted) throw new Error("Request timed out"); const response = await fetch(`${apiUrl}${path}`, { ...init, signal: signal ?? init?.signal, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers } }); if (!response.ok) { const problem = await response.json().catch(() => null) as { title?: string; detail?: string } | null; throw new Error(problem?.detail || problem?.title || `Order request failed (${response.status})`); } return response.json() as Promise<unknown>; }); }

export async function getCustomerOrders(user: User) { return customerOrderSummarySchema.array().parse(await request(user, "/api/v2/orders")); }
export async function getCustomerOrder(user: User, id: string) { return orderSchema.parse(await request(user, `/api/v2/orders/${id}`)); }
export async function getOrderTracking(user: User, id: string) { return orderTrackingSchema.parse(await request(user, `/api/v2/orders/${id}/tracking`)); }
export async function getVendorOrders(user: User) { return vendorOrderDetailSchema.array().parse(await request(user, "/api/v2/vendor/orders")); }
export async function getVendorOrder(user: User, id: string) { return vendorOrderDetailSchema.parse(await request(user, `/api/v2/vendor/orders/${id}`)); }
export async function openVendorOrderCustomerThread(user: User, id: string) { return chatThreadCreatedSchema.parse(await request(user, `/api/v2/vendor/orders/${id}/customer-thread`, { method: "POST" })); }
export async function transitionVendorOrder(user: User, id: string, input: VendorOrderTransition, key: string) { return vendorOrderDetailSchema.parse(await request(user, `/api/v2/vendor/orders/${id}/transitions`, { method: "POST", headers: { "Idempotency-Key": key }, body: JSON.stringify(input) })); }
export async function getInvoice(user: User, id: string) { return invoiceSchema.parse(await request(user, `/api/v2/orders/${id}/invoice`)); }
export async function getFulfillmentDocument(user: User, id: string) { return fulfillmentDocumentSchema.parse(await request(user, `/api/v2/vendor/orders/${id}/documents`)); }
export async function verifyDocumentQr(user: User, payload: string) { return documentQrVerificationSchema.parse(await request(user, "/api/v2/documents/verify", { method: "POST", body: JSON.stringify({ payload }) })); }
