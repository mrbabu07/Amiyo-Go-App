import { bulkProductImportResultSchema, categorySchema, productDetailSchema, productListResponseSchema, shopDetailSchema, shopListResponseSchema, vendorInventorySchema, type BulkProductCsvInput, type CatalogQuery, type CreateProductInput, type InventoryAdjustmentInput, type ModerationInput } from "@amiyo/contracts";
import type { User } from "firebase/auth";

const apiUrl = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

async function publicRequest(path: string) {
  const response = await fetch(`${apiUrl}${path}`);
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { title?: string } | null;
    throw new Error(problem?.title || `Catalog request failed (${response.status})`);
  }
  return response.json() as Promise<unknown>;
}

async function authenticatedRequest(user: User, path: string, init?: RequestInit) { const token = await user.getIdToken(); const response = await fetch(`${apiUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers } }); if (!response.ok) { const problem = await response.json().catch(() => null) as { title?: string; detail?: string } | null; throw new Error(problem?.detail || problem?.title || `Catalog request failed (${response.status})`); } return response.json() as Promise<unknown>; }

function queryString(input: Partial<CatalogQuery>) {
  const params = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const result = params.toString();
  return result ? `?${result}` : "";
}

export async function getCategories() {
  return categorySchema.array().parse(await publicRequest("/api/v2/catalog/categories"));
}

export async function getProducts(input: Partial<CatalogQuery> = {}) {
  return productListResponseSchema.parse(await publicRequest(`/api/v2/catalog/products${queryString(input)}`));
}

export async function searchProducts(query: string) {
  return productListResponseSchema.parse(await publicRequest(`/api/v2/catalog/search${queryString({ query, limit: 30 })}`));
}

export async function getProduct(identifier: string) {
  return productDetailSchema.parse(await publicRequest(`/api/v2/catalog/products/${encodeURIComponent(identifier)}`));
}

export async function getShop(identifier: string) {
  return shopDetailSchema.parse(await publicRequest(`/api/v2/shops/${encodeURIComponent(identifier)}`));
}

export async function getShops() {
  return shopListResponseSchema.parse(await publicRequest("/api/v2/shops?limit=30"));
}

export async function getVendorProducts(user: User) { return productDetailSchema.array().parse(await authenticatedRequest(user, "/api/v2/vendor/products")); }
export async function createVendorProduct(user: User, input: CreateProductInput) { return await authenticatedRequest(user, "/api/v2/vendor/products", { method: "POST", body: JSON.stringify(input) }); }
export async function submitVendorProduct(user: User, id: string) { return await authenticatedRequest(user, `/api/v2/vendor/products/${id}/submit`, { method: "POST" }); }
export async function importVendorProducts(user: User, input: BulkProductCsvInput) { return bulkProductImportResultSchema.parse(await authenticatedRequest(user, "/api/v2/vendor/products/import", { method: "POST", body: JSON.stringify(input) })); }
export async function exportVendorProducts(user: User) { const token = await user.getIdToken(); const response = await fetch(`${apiUrl}/api/v2/vendor/products/export.csv`, { headers: { Authorization: `Bearer ${token}` } }); if (!response.ok) throw new Error(`Product export failed (${response.status})`); return response.text(); }
export async function getVendorInventory(user: User) { return vendorInventorySchema.array().parse(await authenticatedRequest(user, "/api/v2/vendor/inventory")); }
export async function adjustVendorInventory(user: User, variantId: string, input: InventoryAdjustmentInput) { return vendorInventorySchema.parse(await authenticatedRequest(user, `/api/v2/vendor/inventory/${variantId}`, { method: "PUT", body: JSON.stringify(input) })); }
export async function getAdminProducts(user: User) { return productDetailSchema.array().parse(await authenticatedRequest(user, "/api/v2/admin/catalog/products")); }
export async function moderateAdminProduct(user: User, id: string, input: ModerationInput) { return await authenticatedRequest(user, `/api/v2/admin/catalog/products/${id}/moderate`, { method: "POST", body: JSON.stringify(input) }); }
