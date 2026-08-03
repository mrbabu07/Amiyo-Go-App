import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { createSupportTicketSchema, supportMessageInputSchema, supportTicketStatusInputSchema } from "@amiyo/contracts";
import { prisma } from "../../infrastructure/database/prisma.js";
import { FirebaseTokenVerifier } from "../identity/firebase-token.verifier.js";
import { createAuthenticationMiddleware, requireSession } from "../identity/identity.middleware.js";
import { IdentityService } from "../identity/identity.service.js";
import { SupportService } from "./support.service.js";

const idSchema = z.object({ id: z.string().uuid() });

export function createSupportRouter() {
  const router = Router();
  const service = new SupportService(prisma);
  const authenticate = createAuthenticationMiddleware(new FirebaseTokenVerifier(), new IdentityService(prisma));
  const writeLimit = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false, message: { type: "https://amiyo.app/problems/rate-limit", title: "Too many requests", status: 429, code: "SUPPORT_RATE_LIMITED" } });

  router.use(["/api/v2/support", "/api/v2/admin/support"], authenticate);
  router.get("/api/v2/support/tickets", async (req, res, next) => { try { res.json(await service.listMine(requireSession(req))); } catch (error) { next(error); } });
  router.post("/api/v2/support/tickets", writeLimit, async (req, res, next) => { try { res.status(201).json(await service.create(requireSession(req), createSupportTicketSchema.parse(req.body))); } catch (error) { next(error); } });
  router.post("/api/v2/support/tickets/:id/messages", writeLimit, async (req, res, next) => { try { res.status(201).json(await service.addMessage(requireSession(req), idSchema.parse(req.params).id, supportMessageInputSchema.parse(req.body))); } catch (error) { next(error); } });
  router.get("/api/v2/admin/support/tickets", async (req, res, next) => { try { res.json(await service.listAdmin(requireSession(req))); } catch (error) { next(error); } });
  router.patch("/api/v2/admin/support/tickets/:id/status", writeLimit, async (req, res, next) => { try { res.json(await service.updateStatus(requireSession(req), idSchema.parse(req.params).id, supportTicketStatusInputSchema.parse(req.body))); } catch (error) { next(error); } });
  return router;
}
