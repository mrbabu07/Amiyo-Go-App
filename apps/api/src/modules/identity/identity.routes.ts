import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { accountDeletionInputSchema, addressInputSchema, deviceInputSchema, updateProfileSchema } from "@amiyo/contracts";
import { prisma } from "../../infrastructure/database/prisma.js";
import { FirebaseTokenVerifier } from "./firebase-token.verifier.js";
import { createAuthenticationMiddleware, requireSession } from "./identity.middleware.js";
import { IdentityService } from "./identity.service.js";
import type { IdentityTokenVerifier } from "./identity.types.js";

const idParamsSchema = z.object({ id: z.string().uuid() });

function correlationId(headers: Record<string, unknown>) {
  const value = headers["x-correlation-id"];
  return typeof value === "string" ? value : undefined;
}

export function createIdentityRouter(options?: { service?: IdentityService; verifier?: IdentityTokenVerifier }) {
  const router = Router();
  const service = options?.service ?? new IdentityService(prisma);
  const verifier = options?.verifier ?? new FirebaseTokenVerifier();
  const authenticate = createAuthenticationMiddleware(verifier, service);
  const sessionRateLimit = rateLimit({
    windowMs: 60_000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { title: "Too many authentication requests", status: 429, code: "AUTH_RATE_LIMITED" }
  });

  router.use("/api/v2/auth/session", sessionRateLimit);
  router.use(["/api/v2/auth/session", "/api/v2/me", "/api/v2/devices"], authenticate);

  router.post("/api/v2/auth/session", (req, res) => {
    res.json(requireSession(req));
  });

  router.get("/api/v2/me", async (req, res, next) => {
    try {
      res.json(await service.getSession(requireSession(req).principal.userId));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/api/v2/me", async (req, res, next) => {
    try {
      const session = requireSession(req);
      res.json(await service.updateProfile(session.principal.userId, updateProfileSchema.parse(req.body), correlationId(req.headers)));
    } catch (error) {
      next(error);
    }
  });

  router.get("/api/v2/me/addresses", async (req, res, next) => {
    try {
      res.json(await service.listAddresses(requireSession(req).principal.userId));
    } catch (error) {
      next(error);
    }
  });

  router.post("/api/v2/me/addresses", async (req, res, next) => {
    try {
      const session = requireSession(req);
      res.status(201).json(await service.createAddress(session.principal.userId, addressInputSchema.parse(req.body), correlationId(req.headers)));
    } catch (error) {
      next(error);
    }
  });

  router.put("/api/v2/me/addresses/:id", async (req, res, next) => {
    try {
      const session = requireSession(req);
      const { id } = idParamsSchema.parse(req.params);
      res.json(await service.updateAddress(session.principal.userId, id, addressInputSchema.parse(req.body), correlationId(req.headers)));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/api/v2/me/addresses/:id", async (req, res, next) => {
    try {
      const session = requireSession(req);
      const { id } = idParamsSchema.parse(req.params);
      await service.deleteAddress(session.principal.userId, id, correlationId(req.headers));
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.get("/api/v2/devices", async (req, res, next) => {
    try {
      res.json(await service.listDevices(requireSession(req).principal.userId));
    } catch (error) {
      next(error);
    }
  });

  router.post("/api/v2/devices", async (req, res, next) => {
    try {
      const session = requireSession(req);
      res.status(201).json(await service.registerDevice(session.principal.userId, deviceInputSchema.parse(req.body), correlationId(req.headers)));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/api/v2/devices/:id", async (req, res, next) => {
    try {
      const session = requireSession(req);
      const { id } = idParamsSchema.parse(req.params);
      res.json(await service.revokeDevice(session.principal.userId, id, correlationId(req.headers)));
    } catch (error) {
      next(error);
    }
  });

  router.get("/api/v2/me/deletion-request", async (req, res, next) => {
    try { res.json(await service.getDeletionRequest(requireSession(req).principal.userId)); } catch (error) { next(error); }
  });

  router.post("/api/v2/me/deletion-request", async (req, res, next) => {
    try { const session = requireSession(req); res.status(201).json(await service.requestDeletion(session.principal.userId, accountDeletionInputSchema.parse(req.body), correlationId(req.headers))); } catch (error) { next(error); }
  });

  return router;
}
