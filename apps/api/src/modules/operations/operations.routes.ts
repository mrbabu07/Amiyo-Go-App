import { Router } from "express";
import { z } from "zod";
import { cancelOrderSchema, codReconciliationInputSchema, completePayoutSchema, completeRefundSchema, createPayoutRequestSchema, createReturnSchema, deliveryRetryInputSchema, deliverySettingsInputSchema, returnTransitionSchema, reviewPayoutSchema, sellerReturnReceiptSchema, sellerReturnResponseSchema, serviceabilityInputSchema } from "@amiyo/contracts";
import { prisma } from "../../infrastructure/database/prisma.js";
import { ApiProblem } from "../../middleware/api-problem.js";
import { FirebaseTokenVerifier } from "../identity/firebase-token.verifier.js";
import { createAuthenticationMiddleware, requireSession } from "../identity/identity.middleware.js";
import { IdentityService } from "../identity/identity.service.js";
import { OperationsService } from "./operations.service.js";

const idSchema = z.object({ id: z.string().uuid() });
function key(value: string | undefined) { if (!value || !z.string().uuid().safeParse(value).success) throw new ApiProblem(400, "IDEMPOTENCY_KEY_REQUIRED", "A UUID Idempotency-Key header is required"); return value; }

export function createOperationsRouter() {
  const router = Router(); const service = new OperationsService(prisma); const authenticate = createAuthenticationMiddleware(new FirebaseTokenVerifier(), new IdentityService(prisma));
  router.get("/api/v2/delivery/settings", async (_req, res, next) => { try { res.json(await service.deliverySettings()); } catch (error) { next(error); } });
  router.post("/api/v2/delivery/serviceability", async (req, res, next) => { try { res.json(await service.serviceability(serviceabilityInputSchema.parse(req.body))); } catch (error) { next(error); } });
  router.use(["/api/v2/orders", "/api/v2/returns", "/api/v2/vendor/finance", "/api/v2/vendor/payouts", "/api/v2/vendor/returns", "/api/v2/admin"], authenticate);
  router.post("/api/v2/orders/:id/cancel", async (req, res, next) => { try { res.json(await service.cancelOrder(requireSession(req), idSchema.parse(req.params).id, cancelOrderSchema.parse(req.body), key(req.header("idempotency-key")), req.header("x-correlation-id"))); } catch (error) { next(error); } });
  router.get("/api/v2/returns", async (req, res, next) => { try { res.json(await service.returns(requireSession(req))); } catch (error) { next(error); } });
  router.post("/api/v2/returns", async (req, res, next) => { try { res.status(201).json(await service.createReturn(requireSession(req), createReturnSchema.parse(req.body), key(req.header("idempotency-key")), req.header("x-correlation-id"))); } catch (error) { next(error); } });
  router.post("/api/v2/vendor/returns/:id/response", async (req, res, next) => { try { res.json(await service.respondToVendorReturn(requireSession(req), idSchema.parse(req.params).id, sellerReturnResponseSchema.parse(req.body), key(req.header("idempotency-key")), req.header("x-correlation-id"))); } catch (error) { next(error); } });
  router.post("/api/v2/vendor/returns/:id/receipt", async (req, res, next) => { try { res.json(await service.confirmVendorReturnReceipt(requireSession(req), idSchema.parse(req.params).id, sellerReturnReceiptSchema.parse(req.body), key(req.header("idempotency-key")), req.header("x-correlation-id"))); } catch (error) { next(error); } });
  router.get("/api/v2/vendor/finance", async (req, res, next) => { try { res.json(await service.finance(requireSession(req))); } catch (error) { next(error); } });
  router.post("/api/v2/vendor/payouts", async (req, res, next) => { try { res.status(201).json(await service.requestPayout(requireSession(req), createPayoutRequestSchema.parse(req.body), key(req.header("idempotency-key")), req.header("x-correlation-id"))); } catch (error) { next(error); } });
  router.get("/api/v2/admin/returns", async (req, res, next) => { try { res.json(await service.returns(requireSession(req), true)); } catch (error) { next(error); } });
  router.post("/api/v2/admin/returns/:id/transitions", async (req, res, next) => { try { res.json(await service.transitionReturn(requireSession(req), idSchema.parse(req.params).id, returnTransitionSchema.parse(req.body), key(req.header("idempotency-key")), req.header("x-correlation-id"))); } catch (error) { next(error); } });
  router.post("/api/v2/admin/returns/:id/refund-completion", async (req, res, next) => { try { res.json(await service.completeRefund(requireSession(req), idSchema.parse(req.params).id, completeRefundSchema.parse(req.body), key(req.header("idempotency-key")))); } catch (error) { next(error); } });
  router.get("/api/v2/admin/payouts", async (req, res, next) => { try { res.json(await service.payouts(requireSession(req))); } catch (error) { next(error); } });
  router.post("/api/v2/admin/payouts/:id/review", async (req, res, next) => { try { res.json(await service.reviewPayout(requireSession(req), idSchema.parse(req.params).id, reviewPayoutSchema.parse(req.body), key(req.header("idempotency-key")))); } catch (error) { next(error); } });
  router.post("/api/v2/admin/payouts/:id/completion", async (req, res, next) => { try { res.json(await service.completePayout(requireSession(req), idSchema.parse(req.params).id, completePayoutSchema.parse(req.body), key(req.header("idempotency-key")))); } catch (error) { next(error); } });
  router.post("/api/v2/admin/cod/reconciliations", async (req, res, next) => { try { res.status(201).json(await service.reconcileCod(requireSession(req), codReconciliationInputSchema.parse(req.body), key(req.header("idempotency-key")))); } catch (error) { next(error); } });
  router.get("/api/v2/admin/delivery-queue", async (req, res, next) => { try { res.json(await service.deliveryQueue(requireSession(req))); } catch (error) { next(error); } });
  router.get("/api/v2/admin/delivery-settings", async (req, res, next) => { try { requireSession(req); res.json(await service.deliverySettings()); } catch (error) { next(error); } });
  router.put("/api/v2/admin/delivery-settings", async (req, res, next) => { try { res.json(await service.updateDeliverySettings(requireSession(req), deliverySettingsInputSchema.parse(req.body))); } catch (error) { next(error); } });
  router.post("/api/v2/admin/delivery-queue/:id/retry", async (req, res, next) => { try { res.json(await service.retryDelivery(requireSession(req), idSchema.parse(req.params).id, deliveryRetryInputSchema.parse(req.body), key(req.header("idempotency-key")), req.header("x-correlation-id"))); } catch (error) { next(error); } });
  router.get("/api/v2/admin/audit", async (req, res, next) => { try { res.json(await service.audit(requireSession(req))); } catch (error) { next(error); } });
  return router;
}
