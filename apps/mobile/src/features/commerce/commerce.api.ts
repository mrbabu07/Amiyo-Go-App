import { cartSchema, checkoutQuoteSchema, checkoutResultSchema, type CheckoutInput } from "@amiyo/contracts";
import type { User } from "firebase/auth";

const apiUrl = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

async function authenticatedRequest(user: User, path: string, init?: RequestInit) {
  const token = await user.getIdToken();
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers }
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { title?: string; detail?: string } | null;
    throw new Error(problem?.detail || problem?.title || `Request failed (${response.status})`);
  }
  return response.status === 204 ? undefined : response.json() as Promise<unknown>;
}

export async function getCart(user: User) {
  return cartSchema.parse(await authenticatedRequest(user, "/api/v2/cart"));
}

export async function addCartItem(user: User, variantId: string, quantity = 1) {
  return cartSchema.parse(await authenticatedRequest(user, "/api/v2/cart/items", { method: "POST", body: JSON.stringify({ variantId, quantity }) }));
}

export async function updateCartItem(user: User, itemId: string, quantity: number) {
  return cartSchema.parse(await authenticatedRequest(user, `/api/v2/cart/items/${itemId}`, { method: "PUT", body: JSON.stringify({ quantity }) }));
}

export async function removeCartItem(user: User, itemId: string) {
  return cartSchema.parse(await authenticatedRequest(user, `/api/v2/cart/items/${itemId}`, { method: "DELETE" }));
}

export async function getCheckoutQuote(user: User, couponCode?: string | null) {
  return checkoutQuoteSchema.parse(await authenticatedRequest(user, "/api/v2/checkout/quote", { method: "POST", body: JSON.stringify({ couponCode: couponCode || null }) }));
}

export async function placeOrder(user: User, input: CheckoutInput, idempotencyKey: string) {
  return checkoutResultSchema.parse(await authenticatedRequest(user, "/api/v2/checkout/orders", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(input)
  }));
}
