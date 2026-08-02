import { chatThreadSchema, growthFeedSchema, notificationSchema, wishlistSchema } from "@amiyo/contracts";
import type { User } from "firebase/auth";

const apiUrl = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
async function request(user: User, path: string, init?: RequestInit) { const token = await user.getIdToken(); const response = await fetch(`${apiUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers } }); if (!response.ok) { const problem = await response.json().catch(() => null) as { detail?: string } | null; throw new Error(problem?.detail || `Engagement request failed (${response.status})`); } return response.json() as Promise<unknown>; }
export async function getWishlist(user: User) { return wishlistSchema.parse(await request(user, "/api/v2/wishlist")); }
export async function removeWishlistItem(user: User, productId: string) { return wishlistSchema.parse(await request(user, `/api/v2/wishlist/items/${productId}`, { method: "DELETE" })); }
export async function shareWishlist(user: User) { return wishlistSchema.parse(await request(user, "/api/v2/wishlist/share", { method: "POST" })); }
export async function getNotifications(user: User) { return notificationSchema.array().parse(await request(user, "/api/v2/notifications")); }
export async function readNotification(user: User, id: string) { return notificationSchema.array().parse(await request(user, `/api/v2/notifications/${id}/read`, { method: "POST" })); }
export async function getLoyalty(user: User) { return await request(user, "/api/v2/loyalty") as { id: string; pointsBalance: string; version: number; transactions: Array<{ id: string; points: string; entryType: string; createdAt: string }> }; }
export async function getThreads(user: User) { return chatThreadSchema.array().parse(await request(user, "/api/v2/chat/threads")); }
export async function sendMessage(user: User, threadId: string, body: string) { await request(user, `/api/v2/chat/threads/${threadId}/messages`, { method: "POST", body: JSON.stringify({ body }) }); }
export async function getAlerts(user: User) { return await request(user, "/api/v2/alerts") as Array<{ id: string; productId: string; productName: string; target: { amountMinor: string; currency: string } | null; createdAt: string }> ; }
export async function getPromotions(user: User) { return await request(user, "/api/v2/admin/promotions") as Array<{ id: string; name: string; status: string; priority: number; startsAt: string; endsAt: string }> ; }
export async function getGrowthFeed() { const response = await fetch(`${apiUrl}/api/v2/growth/feed`); if (!response.ok) throw new Error("Could not load offers"); return growthFeedSchema.parse(await response.json()); }
