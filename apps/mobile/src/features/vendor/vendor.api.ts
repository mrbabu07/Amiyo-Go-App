import { vendorWorkspaceSchema, type SaveVendorBankAccount, type SubmitVendorKyc, type UpdateVendorShop } from "@amiyo/contracts";
import type { User } from "firebase/auth";

const apiUrl = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
async function request(user: User, path: string, init?: RequestInit) { const token = await user.getIdToken(); const response = await fetch(`${apiUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers } }); if (!response.ok) { const problem = await response.json().catch(() => null) as { title?: string; detail?: string } | null; throw new Error(problem?.detail || problem?.title || `Vendor request failed (${response.status})`); } return response.json() as Promise<unknown>; }
export async function getVendorWorkspace(user: User) { return vendorWorkspaceSchema.parse(await request(user, "/api/v2/vendor/workspace")); }
export async function updateVendorShop(user: User, id: string, input: UpdateVendorShop) { return vendorWorkspaceSchema.parse(await request(user, `/api/v2/vendor/workspace/shops/${id}`, { method: "PATCH", body: JSON.stringify(input) })); }
export async function submitVendorKyc(user: User, input: SubmitVendorKyc) { return vendorWorkspaceSchema.parse(await request(user, "/api/v2/vendor/workspace/kyc", { method: "POST", body: JSON.stringify(input) })); }
export async function saveVendorBankAccount(user: User, input: SaveVendorBankAccount) { return vendorWorkspaceSchema.parse(await request(user, "/api/v2/vendor/workspace/bank-accounts", { method: "POST", body: JSON.stringify(input) })); }
