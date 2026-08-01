import { categorySchema, productDetailSchema, productListResponseSchema, shopDetailSchema, shopListResponseSchema, type CatalogQuery } from "@amiyo/contracts";

const apiUrl = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

async function publicRequest(path: string) {
  const response = await fetch(`${apiUrl}${path}`);
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { title?: string } | null;
    throw new Error(problem?.title || `Catalog request failed (${response.status})`);
  }
  return response.json() as Promise<unknown>;
}

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
