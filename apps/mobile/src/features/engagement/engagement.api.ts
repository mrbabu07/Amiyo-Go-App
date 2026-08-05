import { chatThreadCreatedSchema, chatThreadSchema, growthFeedSchema, newsletterWorkspaceSchema, notificationSchema, questionSchema, reviewSchema, sharedWishlistSchema, wishlistSchema, type ContentModerationInput, type NewsletterBroadcastInput } from "@amiyo/contracts";
import type { User } from "firebase/auth";

const apiUrl = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
async function request(user: User, path: string, init?: RequestInit) { const token = await user.getIdToken(); const response = await fetch(`${apiUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers } }); if (!response.ok) { const problem = await response.json().catch(() => null) as { detail?: string } | null; throw new Error(problem?.detail || `Engagement request failed (${response.status})`); } return response.status === 204 ? null : response.json() as Promise<unknown>; }
export async function getWishlist(user: User) { return wishlistSchema.parse(await request(user, "/api/v2/wishlist")); }
export async function addWishlistItem(user: User, productId: string) { return wishlistSchema.parse(await request(user, "/api/v2/wishlist/items", { method: "POST", body: JSON.stringify({ productId }) })); }
export async function removeWishlistItem(user: User, productId: string) { return wishlistSchema.parse(await request(user, `/api/v2/wishlist/items/${productId}`, { method: "DELETE" })); }
export async function shareWishlist(user: User) { return wishlistSchema.parse(await request(user, "/api/v2/wishlist/share", { method: "POST" })); }
export async function unshareWishlist(user: User) { return wishlistSchema.parse(await request(user, "/api/v2/wishlist/share", { method: "DELETE" })); }
export async function getSharedWishlist(token: string) { const response = await fetch(`${apiUrl}/api/v2/wishlists/shared/${encodeURIComponent(token)}`); if (!response.ok) throw new Error("This wishlist link is invalid or expired"); return sharedWishlistSchema.parse(await response.json()); }
export async function getNotifications(user: User) { return notificationSchema.array().parse(await request(user, "/api/v2/notifications")); }
export async function getMyReviews(user: User) { return reviewSchema.array().parse(await request(user, "/api/v2/reviews")); }
export async function readNotification(user: User, id: string) { return notificationSchema.array().parse(await request(user, `/api/v2/notifications/${id}/read`, { method: "POST" })); }
export async function getLoyalty(user: User) { return await request(user, "/api/v2/loyalty") as { id: string; pointsBalance: string; version: number; transactions: Array<{ id: string; points: string; entryType: string; createdAt: string }> }; }
export async function getThreads(user: User) { return chatThreadSchema.array().parse(await request(user, "/api/v2/chat/threads")); }
export async function createThread(user: User, vendorId: string, subject: string) { return chatThreadCreatedSchema.parse(await request(user, "/api/v2/chat/threads", { method: "POST", body: JSON.stringify({ vendorId, subject }) })); }
export async function sendMessage(user: User, threadId: string, body: string) { await request(user, `/api/v2/chat/threads/${threadId}/messages`, { method: "POST", body: JSON.stringify({ body }) }); }
export async function readThread(user: User, threadId: string) { await request(user, `/api/v2/chat/threads/${threadId}/read`, { method: "POST" }); }
export type ProductAlert = { id: string; productId: string; productName: string; target: { amountMinor: string; currency: string } | null; createdAt: string };
export async function getAlerts(user: User) { return await request(user, "/api/v2/alerts") as ProductAlert[]; }
export async function saveAlert(user: User, productId: string, targetMinor?: string | null) { return await request(user, `/api/v2/alerts/${productId}`, { method: "PUT", body: JSON.stringify({ targetMinor: targetMinor ?? null }) }) as ProductAlert[]; }
export async function removeAlert(user: User, productId: string) { return await request(user, `/api/v2/alerts/${productId}`, { method: "DELETE" }) as ProductAlert[]; }
export async function getPromotions(user: User) { return await request(user, "/api/v2/admin/promotions") as Array<{ id: string; name: string; status: string; priority: number; startsAt: string; endsAt: string }> ; }
export async function getGrowthFeed() { const response = await fetch(`${apiUrl}/api/v2/growth/feed`); if (!response.ok) throw new Error("Could not load offers"); return growthFeedSchema.parse(await response.json()); }
export async function getProductReviews(productId: string) { const response = await fetch(`${apiUrl}/api/v2/catalog/products/${productId}/reviews`); if (!response.ok) throw new Error("Could not load product reviews"); return reviewSchema.array().parse(await response.json()); }
export async function getProductQuestions(productId: string) { const response = await fetch(`${apiUrl}/api/v2/catalog/products/${productId}/questions`); if (!response.ok) throw new Error("Could not load product questions"); return questionSchema.array().parse(await response.json()); }
export async function createProductQuestion(user: User, productId: string, body: string) { return questionSchema.parse(await request(user, `/api/v2/catalog/products/${productId}/questions`, { method: "POST", body: JSON.stringify({ body }) })); }
export async function subscribeNewsletter(email: string) { const response = await fetch(`${apiUrl}/api/v2/newsletter/subscribe`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, source: "app" }) }); if (!response.ok) throw new Error("Please enter a valid email address"); return response.json() as Promise<{ id: string; email: string; active: boolean }>; }
export async function getNewsletterWorkspace(user: User) { return newsletterWorkspaceSchema.parse(await request(user, "/api/v2/admin/newsletter")); }
export async function createNewsletterBroadcast(user: User, input: NewsletterBroadcastInput) { return newsletterWorkspaceSchema.parse(await request(user, "/api/v2/admin/newsletter/broadcasts", { method: "POST", body: JSON.stringify(input) })); }
export async function sendNewsletterBroadcast(user: User, id: string) { return newsletterWorkspaceSchema.parse(await request(user, `/api/v2/admin/newsletter/broadcasts/${id}/send`, { method: "POST" })); }
export async function getVendorReviews(user: User) { return reviewSchema.array().parse(await request(user, "/api/v2/vendor/engagement/reviews")); }
export async function getVendorQuestions(user: User) { return questionSchema.array().parse(await request(user, "/api/v2/vendor/engagement/questions")); }
export async function answerVendorQuestion(user: User, id: string, body: string) { return await request(user, `/api/v2/questions/${id}/answers`, { method: "POST", body: JSON.stringify({ body }) }); }
export async function getAdminReviews(user: User) { return reviewSchema.array().parse(await request(user, "/api/v2/admin/content/reviews")); }
export async function moderateAdminReview(user: User, id: string, input: ContentModerationInput) { return await request(user, `/api/v2/admin/content/reviews/${id}`, { method: "PATCH", body: JSON.stringify(input) }); }
export async function getAdminQuestions(user: User) { return questionSchema.array().parse(await request(user, "/api/v2/admin/content/questions")); }
export async function moderateAdminQuestion(user: User, id: string, input: ContentModerationInput) { return await request(user, `/api/v2/admin/content/questions/${id}`, { method: "PATCH", body: JSON.stringify(input) }); }
