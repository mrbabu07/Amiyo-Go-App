import { Router } from "express";
import { z } from "zod";
import { vendorOrderStatusSchema } from "@amiyo/contracts";
import { documentQrVerificationInputSchema, vendorDeliveryExceptionInputSchema, vendorOrderTransitionSchema, vendorPickupRequestInputSchema } from "@amiyo/contracts";
import { prisma } from "../../infrastructure/database/prisma.js";
import { ApiProblem } from "../../middleware/api-problem.js";
import { authenticatedWriteLimit } from "../../middleware/authenticated-write-limit.js";
import { FirebaseTokenVerifier } from "../identity/firebase-token.verifier.js";
import { createAuthenticationMiddleware, requireSession } from "../identity/identity.middleware.js";
import { IdentityService } from "../identity/identity.service.js";
import { DeliveryCallbackService } from "./delivery-callback.service.js";
import { OrderService } from "./order.service.js";
import { scannerBarcode } from "./scanner-barcode.js";

const idSchema = z.object({ id: z.string().uuid() });
const listSchema = z.object({ cursor: z.string().uuid().optional(), limit: z.coerce.number().int().min(1).max(100).default(30), status: vendorOrderStatusSchema.optional(), orderId: z.string().uuid().optional(), search: z.string().trim().max(100).optional(), shop: z.string().trim().max(160).optional(), payment: z.string().trim().toUpperCase().regex(/^[A-Z0-9_ -]{2,50}$/).optional() });

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

  router.use(["/api/v2/orders", "/api/v2/vendor/orders", "/api/v2/documents"], authenticate);
  router.use(["/api/v2/vendor/orders", "/api/v2/documents"], authenticatedWriteLimit({ code: "ORDER_WRITE_RATE_LIMITED", limit: 30 }));
  router.post("/api/v2/documents/verify", async (req, res, next) => { try { res.json(await service.verifyDocument(requireSession(req), documentQrVerificationInputSchema.parse(req.body).payload)); } catch (error) { next(error); } });
  router.get("/api/v2/orders", async (req, res, next) => { try { res.json(await service.customerOrders(requireSession(req))); } catch (error) { next(error); } });
  router.get("/api/v2/orders/:id/tracking", async (req, res, next) => { try { res.json(await service.tracking(requireSession(req), idSchema.parse(req.params).id)); } catch (error) { next(error); } });
  router.get("/api/v2/orders/:id", async (req, res, next) => { try { res.json(await service.customerOrder(requireSession(req), idSchema.parse(req.params).id)); } catch (error) { next(error); } });
  router.get("/api/v2/orders/:id/invoice", async (req, res, next) => { try { res.json(await service.invoice(requireSession(req), idSchema.parse(req.params).id)); } catch (error) { next(error); } });
  router.get("/api/v2/vendor/orders", async (req, res, next) => { try { res.json(await service.vendorOrders(requireSession(req), listSchema.parse(req.query))); } catch (error) { next(error); } });
  router.get("/api/v2/vendor/orders/counts", async (req, res, next) => { try { res.json(await service.vendorOrderCounts(requireSession(req))); } catch (error) { next(error); } });
  router.get("/api/v2/vendor/orders/:id", async (req, res, next) => { try { res.json(await service.vendorOrder(requireSession(req), idSchema.parse(req.params).id)); } catch (error) { next(error); } });
  router.post("/api/v2/vendor/orders/:id/customer-thread", async (req, res, next) => { try { res.json(await service.customerThread(requireSession(req), idSchema.parse(req.params).id)); } catch (error) { next(error); } });
  router.post("/api/v2/vendor/orders/:id/delivery-exceptions", async (req, res, next) => {
    try {
      const key = req.header("idempotency-key");
      if (!key || !z.string().uuid().safeParse(key).success) throw new ApiProblem(400, "IDEMPOTENCY_KEY_REQUIRED", "A UUID Idempotency-Key header is required");
      res.json(await service.reportDeliveryException(requireSession(req), idSchema.parse(req.params).id, vendorDeliveryExceptionInputSchema.parse(req.body), key, req.header("x-correlation-id")));
    } catch (error) { next(error); }
  });
  router.post("/api/v2/vendor/orders/:id/pickup-request", async (req, res, next) => {
    try {
      const key = req.header("idempotency-key");
      if (!key || !z.string().uuid().safeParse(key).success) throw new ApiProblem(400, "IDEMPOTENCY_KEY_REQUIRED", "A UUID Idempotency-Key header is required");
      res.json(await service.requestPickup(requireSession(req), idSchema.parse(req.params).id, vendorPickupRequestInputSchema.parse(req.body), key, req.header("x-correlation-id")));
    } catch (error) { next(error); }
  });
  router.get("/api/v2/vendor/orders/:id/documents", async (req, res, next) => { try { res.json(await service.fulfillmentDocument(requireSession(req), idSchema.parse(req.params).id)); } catch (error) { next(error); } });
  router.get("/api/v2/vendor/orders/:id/scanner-barcode", async (req, res, next) => { try { const document = await service.fulfillmentDocument(requireSession(req), idSchema.parse(req.params).id); res.setHeader("Cache-Control", "no-store"); res.json(await scannerBarcode(document.parcelId)); } catch (error) { next(error); } });
  router.post("/api/v2/vendor/orders/:id/transitions", async (req, res, next) => {
    try {
      const key = req.header("idempotency-key");
      if (!key || !z.string().uuid().safeParse(key).success) throw new ApiProblem(400, "IDEMPOTENCY_KEY_REQUIRED", "A UUID Idempotency-Key header is required");
      res.json(await service.transitionVendorOrder(requireSession(req), idSchema.parse(req.params).id, vendorOrderTransitionSchema.parse(req.body), key, req.header("x-correlation-id")));
    } catch (error) { next(error); }
  });
  return router;
}
