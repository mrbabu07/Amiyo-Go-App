import { Router } from "express";
import { z } from "zod";
import { vendorOrderStatusSchema } from "@amiyo/contracts";
import { vendorOrderTransitionSchema } from "@amiyo/contracts";
import { prisma } from "../../infrastructure/database/prisma.js";
import { ApiProblem } from "../../middleware/api-problem.js";
import { FirebaseTokenVerifier } from "../identity/firebase-token.verifier.js";
import { createAuthenticationMiddleware, requireSession } from "../identity/identity.middleware.js";
import { IdentityService } from "../identity/identity.service.js";
import { DeliveryCallbackService } from "./delivery-callback.service.js";
import { OrderService } from "./order.service.js";

const idSchema = z.object({ id: z.string().uuid() });
const listSchema = z.object({ status: vendorOrderStatusSchema.optional() });

export function createOrderRouter() {
  const router = Router();
  const service = new OrderService(prisma);
  const callback = new DeliveryCallbackService(prisma);
  const authenticate = createAuthenticationMiddleware(new FirebaseTokenVerifier(), new IdentityService(prisma));

  router.post("/integrations/amiyo-delivery/callbacks", async (req, res, next) => {
    try {
      callback.verify(req.rawBody ?? Buffer.alloc(0), { apiKey: req.header("x-api-key"), timestamp: req.header("x-amiyo-delivery-timestamp"), signature: req.header("x-amiyo-delivery-signature") });
      res.json(await callback.process(req.body));
    } catch (error) { next(error); }
  });

  router.use(["/api/v2/orders", "/api/v2/vendor/orders"], authenticate);
  router.get("/api/v2/orders", async (req, res, next) => { try { res.json(await service.customerOrders(requireSession(req))); } catch (error) { next(error); } });
  router.get("/api/v2/orders/:id/tracking", async (req, res, next) => { try { res.json(await service.tracking(requireSession(req), idSchema.parse(req.params).id)); } catch (error) { next(error); } });
  router.get("/api/v2/orders/:id", async (req, res, next) => { try { res.json(await service.customerOrder(requireSession(req), idSchema.parse(req.params).id)); } catch (error) { next(error); } });
  router.get("/api/v2/vendor/orders", async (req, res, next) => { try { res.json(await service.vendorOrders(requireSession(req), listSchema.parse(req.query).status)); } catch (error) { next(error); } });
  router.get("/api/v2/vendor/orders/:id", async (req, res, next) => { try { res.json(await service.vendorOrder(requireSession(req), idSchema.parse(req.params).id)); } catch (error) { next(error); } });
  router.post("/api/v2/vendor/orders/:id/transitions", async (req, res, next) => {
    try {
      const key = req.header("idempotency-key");
      if (!key || !z.string().uuid().safeParse(key).success) throw new ApiProblem(400, "IDEMPOTENCY_KEY_REQUIRED", "A UUID Idempotency-Key header is required");
      res.json(await service.transitionVendorOrder(requireSession(req), idSchema.parse(req.params).id, vendorOrderTransitionSchema.parse(req.body), key, req.header("x-correlation-id")));
    } catch (error) { next(error); }
  });
  return router;
}
