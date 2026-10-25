import { cartSchema, checkoutQuoteSchema, checkoutResultSchema, type CheckoutInput } from "@amiyo/contracts";
import type { User } from "@firebase/auth";
import { pendingCheckoutStore } from "./checkout-recovery.storage";
import { mayDiscardRejectedCheckout } from "./pending-checkout";

class CommerceRequestError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) { super(message); }
}

const activeCheckouts = new Set<string>();
export const getPendingCheckout = (user: User) => pendingCheckoutStore.load(user.uid);

const apiUrl = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

async function authenticatedRequest(user: User, path: string, init?: RequestInit) {
  const token = await user.getIdToken();
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers }
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { title?: string; detail?: string; code?: string } | null;
    throw new CommerceRequestError(problem?.detail || problem?.title || `Request failed (${response.status})`, response.status, problem?.code || "");
  }
  return response.status === 204 ? undefined : response.json() as Promise<unknown>;
}

export async function getCart(user: User) {
  return cartSchema.parse(await authenticatedRequest(user, "/api/v2/cart"));
}

export async function addCartItem(user: User, variantId: string, quantity = 1, idempotencyKey?: string) {
  return cartSchema.parse(await authenticatedRequest(user, "/api/v2/cart/items", { method: "POST", ...(idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : {}), body: JSON.stringify({ variantId, quantity }) }));
}

export async function updateCartItem(user: User, itemId: string, quantity: number) {
  return cartSchema.parse(await authenticatedRequest(user, `/api/v2/cart/items/${itemId}`, { method: "PUT", body: JSON.stringify({ quantity }) }));
}

export async function removeCartItem(user: User, itemId: string) {
  return cartSchema.parse(await authenticatedRequest(user, `/api/v2/cart/items/${itemId}`, { method: "DELETE" }));
}

export async function getCheckoutQuote(user: User, couponCode?: string | null, loyaltyPoints = "0", addressId?: string | null) {
  return checkoutQuoteSchema.parse(await authenticatedRequest(user, "/api/v2/checkout/quote", { method: "POST", body: JSON.stringify({ addressId: addressId || undefined, couponCode: couponCode || null, loyaltyPoints }) }));
}

export async function placeOrder(user: User, input: CheckoutInput, idempotencyKey: string) {
  if (activeCheckouts.has(user.uid)) throw new Error("A checkout is already in progress");
  activeCheckouts.add(user.uid);
  try {
    const pending = await pendingCheckoutStore.prepare(user.uid, input, idempotencyKey);
    let raw: unknown;
    try { raw = await authenticatedRequest(user, "/api/v2/checkout/orders", {
      method: "POST",
      headers: { "Idempotency-Key": pending.key },
      body: JSON.stringify(pending.input)
    }); } catch (error) {
      if (error instanceof CommerceRequestError && mayDiscardRejectedCheckout(pending.fresh, error.status, error.code)) await pendingCheckoutStore.complete(user.uid, pending.key);
      throw error;
    }
    const result = checkoutResultSchema.parse(raw);
    await pendingCheckoutStore.complete(user.uid, pending.key);
    return result;
  } finally {
    activeCheckouts.delete(user.uid);
  }
}
