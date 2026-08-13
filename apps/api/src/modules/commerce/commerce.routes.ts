import { Router, urlencoded } from "express";
import { z } from "zod";
import { addCartItemSchema, checkoutInputSchema, checkoutQuoteInputSchema, updateCartItemSchema } from "@amiyo/contracts";
import { prisma } from "../../infrastructure/database/prisma.js";
import { ApiProblem } from "../../middleware/api-problem.js";
import { FirebaseTokenVerifier } from "../identity/firebase-token.verifier.js";
import { createAuthenticationMiddleware, requireSession } from "../identity/identity.middleware.js";
import { IdentityService } from "../identity/identity.service.js";
import { CommerceService } from "./commerce.service.js";
import { PaymentWebhookService } from "./payment-webhook.service.js";
import { SslCommerzPaymentService } from "./sslcommerz-payment.service.js";

const idSchema = z.object({ id: z.string().uuid() });

export function createCommerceRouter() {
  const router = Router(); const service = new CommerceService(prisma); const webhook = new PaymentWebhookService(prisma); const sslcommerz = new SslCommerzPaymentService(prisma); const authenticate = createAuthenticationMiddleware(new FirebaseTokenVerifier(), new IdentityService(prisma));
  const sslcommerzForm = urlencoded({ extended: false, limit: "64kb" });
  router.get("/sandbox/payments/:id", async (req, res, next) => { try { if (process.env.NODE_ENV === "production") throw new ApiProblem(404, "NOT_FOUND", "Sandbox payment not found"); const payment = await prisma.payment.findUnique({ where: { id: idSchema.parse(req.params).id }, include: { order: true } }); if (!payment) throw new ApiProblem(404, "PAYMENT_NOT_FOUND", "Payment not found"); res.type("html").send(`<!doctype html><html><head><meta name="viewport" content="width=device-width"><title>Amiyo-Go Payment Sandbox</title><style>body{font-family:system-ui;background:#f5f5f5;display:grid;place-items:center;min-height:100vh;margin:0}.card{background:white;padding:32px;border-radius:16px;box-shadow:0 10px 30px #0001;max-width:420px}button{background:#1e7098;color:white;border:0;border-radius:8px;padding:14px 20px;font-weight:700;width:100%}</style></head><body><main class="card"><h1>Payment sandbox</h1><p>Order ${payment.order.orderNumber}</p><p>Amount: BDT ${(Number(payment.amountMinor) / 100).toFixed(2)}</p><p>Status: <strong>${payment.status}</strong></p><button onclick="capture()">Complete sandbox payment</button><p id="result"></p></main><script>async function capture(){const response=await fetch(location.pathname+'/capture',{method:'POST',headers:{'Content-Type':'application/json'}});const body=await response.json();document.getElementById('result').textContent=response.ok?'Payment captured. You may return to the app.':(body.detail||body.title||'Payment failed');}</script></body></html>`); } catch (error) { next(error); } });
  router.post("/sandbox/payments/:id/capture", async (req, res, next) => { try { if (process.env.NODE_ENV === "production") throw new ApiProblem(404, "NOT_FOUND", "Sandbox payment not found"); const payment = await prisma.payment.findUnique({ where: { id: idSchema.parse(req.params).id } }); if (!payment) throw new ApiProblem(404, "PAYMENT_NOT_FOUND", "Payment not found"); res.json(await webhook.process(payment.provider, { eventId: `sandbox-${payment.id}`, paymentId: payment.id, status: "CAPTURED", transactionId: `sandbox-${payment.id}`, amountMinor: payment.amountMinor.toString() })); } catch (error) { next(error); } });
  router.post("/api/v2/payments/sslcommerz/ipn", sslcommerzForm, async (req, res, next) => { try { res.json(await sslcommerz.receive(req.body)); } catch (error) { next(error); } });
  for (const outcome of ["success", "fail", "cancel"] as const) router.post(`/api/v2/payments/sslcommerz/${outcome}`, sslcommerzForm, async (req, res, next) => { try { const result = await sslcommerz.receive(req.body); const status = outcome === "success" ? ("pending" in result && !result.pending ? "CAPTURED" : "PENDING") : outcome.toUpperCase(); res.redirect(303, sslcommerz.redirectUrl(result, status)); } catch (error) { next(error); } });
  router.post("/api/v2/payment-webhooks/:provider", async (req, res, next) => { try { const provider = z.string().regex(/^[a-z0-9-]+$/).parse(req.params.provider); webhook.verify(req.rawBody ?? Buffer.alloc(0), req.header("x-payment-signature")); res.json(await webhook.process(provider, req.body)); } catch (error) { next(error); } });
  router.use(["/api/v2/cart", "/api/v2/checkout", "/api/v2/payments"], authenticate);
  router.get("/api/v2/cart", async (req, res, next) => { try { res.json(await service.cart(requireSession(req).principal.userId)); } catch (error) { next(error); } });
  router.post("/api/v2/cart/items", async (req, res, next) => { try { const input = addCartItemSchema.parse(req.body); res.status(201).json(await service.addItem(requireSession(req).principal.userId, input.variantId, input.quantity)); } catch (error) { next(error); } });
  router.put("/api/v2/cart/items/:id", async (req, res, next) => { try { res.json(await service.updateItem(requireSession(req).principal.userId, idSchema.parse(req.params).id, updateCartItemSchema.parse(req.body).quantity)); } catch (error) { next(error); } });
  router.delete("/api/v2/cart/items/:id", async (req, res, next) => { try { res.json(await service.removeItem(requireSession(req).principal.userId, idSchema.parse(req.params).id)); } catch (error) { next(error); } });
  router.post("/api/v2/checkout/quote", async (req, res, next) => { try { res.json(await service.quote(requireSession(req).principal.userId, checkoutQuoteInputSchema.parse(req.body ?? {}))); } catch (error) { next(error); } });
  router.post("/api/v2/checkout/orders", async (req, res, next) => { try { const key = req.header("idempotency-key"); if (!key || !z.string().uuid().safeParse(key).success) throw new ApiProblem(400, "IDEMPOTENCY_KEY_REQUIRED", "A UUID Idempotency-Key header is required"); const session = requireSession(req); const input = checkoutInputSchema.parse(req.body); const result = await service.checkout(session, input, key); res.status(201).json(await sslcommerz.attachCheckoutSession(result, session, input.addressId, key)); } catch (error) { next(error); } });
  return router;
}

declare global { namespace Express { interface Request { rawBody?: Buffer } } }
