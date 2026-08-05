import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { answerInputSchema, chatMessageInputSchema, chatThreadInputSchema, contentModerationInputSchema, createPromotionSchema, newsletterBroadcastInputSchema, newsletterSubscribeInputSchema, questionInputSchema, reviewInputSchema, stockAlertInputSchema, wishlistItemInputSchema } from "@amiyo/contracts";
import { prisma } from "../../infrastructure/database/prisma.js";
import { FirebaseTokenVerifier } from "../identity/firebase-token.verifier.js";
import { createAuthenticationMiddleware, requireSession } from "../identity/identity.middleware.js";
import { IdentityService } from "../identity/identity.service.js";
import { EngagementService } from "./engagement.service.js";

const idSchema = z.object({ id: z.string().uuid() });
const productSchema = z.object({ productId: z.string().uuid() });
const tokenSchema = z.object({ token: z.string().uuid() });

export function createEngagementRouter() {
  const router = Router(); const service = new EngagementService(prisma); const authenticate = createAuthenticationMiddleware(new FirebaseTokenVerifier(), new IdentityService(prisma));
  const writeLimit = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false, message: { type: "https://amiyo.app/problems/rate-limit", title: "Too many requests", status: 429, code: "ENGAGEMENT_RATE_LIMITED" } });
  const chatLimit = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false, message: { type: "https://amiyo.app/problems/rate-limit", title: "Too many messages", status: 429, code: "CHAT_RATE_LIMITED" } });

  router.get("/api/v2/growth/feed", async (_req, res, next) => { try { res.json(await service.growthFeed()); } catch (error) { next(error); } });
  router.post("/api/v2/newsletter/subscribe", writeLimit, async (req, res, next) => { try { res.status(201).json(await service.subscribeNewsletter(newsletterSubscribeInputSchema.parse(req.body))); } catch (error) { next(error); } });
  router.get("/api/v2/newsletter/unsubscribe/:token", async (req, res, next) => { try { res.json(await service.unsubscribeNewsletter(tokenSchema.parse(req.params).token)); } catch (error) { next(error); } });
  router.get("/api/v2/catalog/products/:productId/reviews", async (req, res, next) => { try { res.json(await service.productReviews(productSchema.parse(req.params).productId)); } catch (error) { next(error); } });
  router.get("/api/v2/catalog/products/:productId/questions", async (req, res, next) => { try { res.json(await service.questions(productSchema.parse(req.params).productId)); } catch (error) { next(error); } });
  router.get("/api/v2/wishlists/shared/:token", async (req, res, next) => { try { res.json(await service.sharedWishlist(tokenSchema.parse(req.params).token)); } catch (error) { next(error); } });

  router.use(["/api/v2/wishlist", "/api/v2/alerts", "/api/v2/reviews", "/api/v2/questions", "/api/v2/notifications", "/api/v2/chat", "/api/v2/loyalty", "/api/v2/vendor/engagement", "/api/v2/admin/content", "/api/v2/admin/promotions", "/api/v2/admin/newsletter"], authenticate);
  router.get("/api/v2/wishlist", async (req, res, next) => { try { res.json(await service.wishlist(requireSession(req).principal.userId)); } catch (error) { next(error); } });
  router.post("/api/v2/wishlist/items", writeLimit, async (req, res, next) => { try { res.status(201).json(await service.addWishlistItem(requireSession(req).principal.userId, wishlistItemInputSchema.parse(req.body).productId)); } catch (error) { next(error); } });
  router.delete("/api/v2/wishlist/items/:productId", writeLimit, async (req, res, next) => { try { res.json(await service.removeWishlistItem(requireSession(req).principal.userId, productSchema.parse(req.params).productId)); } catch (error) { next(error); } });
  router.post("/api/v2/wishlist/share", writeLimit, async (req, res, next) => { try { res.json(await service.shareWishlist(requireSession(req).principal.userId)); } catch (error) { next(error); } });
  router.delete("/api/v2/wishlist/share", writeLimit, async (req, res, next) => { try { res.json(await service.unshareWishlist(requireSession(req).principal.userId)); } catch (error) { next(error); } });
  router.get("/api/v2/alerts", async (req, res, next) => { try { res.json(await service.alerts(requireSession(req).principal.userId)); } catch (error) { next(error); } });
  router.put("/api/v2/alerts/:productId", writeLimit, async (req, res, next) => { try { const input = stockAlertInputSchema.parse({ ...req.body, productId: productSchema.parse(req.params).productId }); res.json(await service.saveAlert(requireSession(req).principal.userId, input.productId, input.targetMinor)); } catch (error) { next(error); } });
  router.delete("/api/v2/alerts/:productId", writeLimit, async (req, res, next) => { try { res.json(await service.removeAlert(requireSession(req).principal.userId, productSchema.parse(req.params).productId)); } catch (error) { next(error); } });
  router.get("/api/v2/reviews", async (req, res, next) => { try { res.json(await service.myReviews(requireSession(req))); } catch (error) { next(error); } });
  router.post("/api/v2/reviews", writeLimit, async (req, res, next) => { try { res.status(201).json(await service.createReview(requireSession(req), reviewInputSchema.parse(req.body))); } catch (error) { next(error); } });
  router.post("/api/v2/catalog/products/:productId/questions", authenticate, writeLimit, async (req, res, next) => { try { res.status(201).json(await service.createQuestion(requireSession(req), productSchema.parse(req.params).productId, questionInputSchema.parse(req.body))); } catch (error) { next(error); } });
  router.post("/api/v2/questions/:id/answers", writeLimit, async (req, res, next) => { try { res.status(201).json(await service.answerQuestion(requireSession(req), idSchema.parse(req.params).id, answerInputSchema.parse(req.body))); } catch (error) { next(error); } });
  router.get("/api/v2/vendor/engagement/reviews", async (req, res, next) => { try { res.json(await service.vendorReviews(requireSession(req))); } catch (error) { next(error); } });
  router.get("/api/v2/vendor/engagement/questions", async (req, res, next) => { try { res.json(await service.vendorQuestions(requireSession(req))); } catch (error) { next(error); } });
  router.get("/api/v2/admin/content/reviews", async (req, res, next) => { try { res.json(await service.adminReviews(requireSession(req))); } catch (error) { next(error); } });
  router.patch("/api/v2/admin/content/reviews/:id", writeLimit, async (req, res, next) => { try { res.json(await service.moderateReview(requireSession(req), idSchema.parse(req.params).id, contentModerationInputSchema.parse(req.body))); } catch (error) { next(error); } });
  router.get("/api/v2/admin/content/questions", async (req, res, next) => { try { res.json(await service.adminQuestions(requireSession(req))); } catch (error) { next(error); } });
  router.patch("/api/v2/admin/content/questions/:id", writeLimit, async (req, res, next) => { try { res.json(await service.moderateQuestion(requireSession(req), idSchema.parse(req.params).id, contentModerationInputSchema.parse(req.body))); } catch (error) { next(error); } });
  router.get("/api/v2/notifications", async (req, res, next) => { try { res.json(await service.notifications(requireSession(req).principal.userId)); } catch (error) { next(error); } });
  router.post("/api/v2/notifications/:id/read", async (req, res, next) => { try { res.json(await service.readNotification(requireSession(req).principal.userId, idSchema.parse(req.params).id)); } catch (error) { next(error); } });
  router.get("/api/v2/chat/threads", async (req, res, next) => { try { res.json(await service.threads(requireSession(req).principal.userId)); } catch (error) { next(error); } });
  router.post("/api/v2/chat/threads", writeLimit, async (req, res, next) => { try { res.status(201).json(await service.createThread(requireSession(req), chatThreadInputSchema.parse(req.body))); } catch (error) { next(error); } });
  router.post("/api/v2/chat/threads/:id/messages", chatLimit, async (req, res, next) => { try { res.status(201).json(await service.message(requireSession(req), idSchema.parse(req.params).id, chatMessageInputSchema.parse(req.body))); } catch (error) { next(error); } });
  router.post("/api/v2/chat/threads/:id/read", async (req, res, next) => { try { await service.readThread(requireSession(req).principal.userId, idSchema.parse(req.params).id); res.status(204).end(); } catch (error) { next(error); } });
  router.get("/api/v2/loyalty", async (req, res, next) => { try { res.json(await service.loyalty(requireSession(req).principal.userId)); } catch (error) { next(error); } });
  router.get("/api/v2/admin/promotions", async (req, res, next) => { try { res.json(await service.promotions(requireSession(req))); } catch (error) { next(error); } });
  router.post("/api/v2/admin/promotions", writeLimit, async (req, res, next) => { try { res.status(201).json(await service.createPromotion(requireSession(req), createPromotionSchema.parse(req.body))); } catch (error) { next(error); } });
  router.get("/api/v2/admin/newsletter", async (req, res, next) => { try { res.json(await service.newsletterWorkspace(requireSession(req))); } catch (error) { next(error); } });
  router.post("/api/v2/admin/newsletter/broadcasts", writeLimit, async (req, res, next) => { try { res.status(201).json(await service.createNewsletterBroadcast(requireSession(req), newsletterBroadcastInputSchema.parse(req.body))); } catch (error) { next(error); } });
  router.post("/api/v2/admin/newsletter/broadcasts/:id/send", writeLimit, async (req, res, next) => { try { res.json(await service.sendNewsletterBroadcast(requireSession(req), idSchema.parse(req.params).id)); } catch (error) { next(error); } });
  return router;
}
