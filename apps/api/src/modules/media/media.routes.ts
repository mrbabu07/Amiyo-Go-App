import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { mediaUploadInputSchema } from "@amiyo/contracts";
import { z } from "zod";
import { prisma } from "../../infrastructure/database/prisma.js";
import { FirebaseTokenVerifier } from "../identity/firebase-token.verifier.js";
import { createAuthenticationMiddleware, requireSession } from "../identity/identity.middleware.js";
import { IdentityService } from "../identity/identity.service.js";
import { FirebaseStorageProvider } from "./firebase-storage.provider.js";
import { MediaService } from "./media.service.js";

const idSchema = z.object({ id: z.string().uuid() });
export function createMediaRouter() { const router = Router(); const service = new MediaService(prisma, new FirebaseStorageProvider()); const authenticate = createAuthenticationMiddleware(new FirebaseTokenVerifier(), new IdentityService(prisma)); const writes = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false }); router.use("/api/v2/media", authenticate); router.post("/api/v2/media/uploads", writes, async (req, res, next) => { try { res.status(201).json(await service.initiate(requireSession(req), mediaUploadInputSchema.parse(req.body))); } catch (error) { next(error); } }); router.post("/api/v2/media/uploads/:id/complete", writes, async (req, res, next) => { try { res.json(await service.complete(requireSession(req), idSchema.parse(req.params).id)); } catch (error) { next(error); } }); return router; }
