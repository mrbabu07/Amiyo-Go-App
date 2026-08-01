import { returnSchema, vendorFinanceSchema } from "@amiyo/contracts";
import type { User } from "firebase/auth";

const apiUrl = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
async function request(user: User, path: string) { const token = await user.getIdToken(); const response = await fetch(`${apiUrl}${path}`, { headers: { Authorization: `Bearer ${token}` } }); if (!response.ok) throw new Error(`Operations request failed (${response.status})`); return response.json() as Promise<unknown>; }
export async function getReturns(user: User) { return returnSchema.array().parse(await request(user, "/api/v2/returns")); }
export async function getVendorFinance(user: User) { return vendorFinanceSchema.parse(await request(user, "/api/v2/vendor/finance")); }
export async function getAdminQueues(user: User) { const safe = (path: string) => request(user, path).catch(() => []); const [returns, payouts, audit] = await Promise.all([safe("/api/v2/admin/returns"), safe("/api/v2/admin/payouts"), safe("/api/v2/admin/audit")]); return { returns: returns as Array<{ id: string; status: string; reasonCode: string }>, payouts: payouts as Array<{ id: string; status: string; amount: { amountMinor: string; currency: string }; vendor: { legalName: string } }>, audit: audit as Array<{ id: string; action: string; resourceType: string; createdAt: string }> }; }
