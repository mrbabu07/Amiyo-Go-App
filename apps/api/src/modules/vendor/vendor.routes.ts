import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { createVendorCategoryRequestSchema, createVendorVoucherSchema, saveVendorBankAccountSchema, submitVendorKycSchema, updateVendorShopSchema, updateVendorStaffSchema } from "@amiyo/contracts";
import { prisma } from "../../infrastructure/database/prisma.js";
import { FirebaseTokenVerifier } from "../identity/firebase-token.verifier.js";
import { createAuthenticationMiddleware, requireSession } from "../identity/identity.middleware.js";
import { IdentityService } from "../identity/identity.service.js";
import { VendorService } from "./vendor.service.js";

const idSchema = z.object({ id: z.string().uuid() });
export function createVendorRouter() {
  const router = Router(); const service = new VendorService(prisma); const authenticate = createAuthenticationMiddleware(new FirebaseTokenVerifier(), new IdentityService(prisma));
  const writeLimit = rateLimit({ windowMs: 60_000, limit: 15, standardHeaders: "draft-7", legacyHeaders: false, message: { title: "Too many vendor requests", status: 429, code: "VENDOR_RATE_LIMITED" } });
  router.use("/api/v2/vendor/workspace", authenticate);
  router.get("/api/v2/vendor/workspace", async (req, res, next) => { try { res.json(await service.getWorkspace(requireSession(req))); } catch (error) { next(error); } });
  router.patch("/api/v2/vendor/workspace/shops/:id", writeLimit, async (req, res, next) => { try { res.json(await service.updateShop(requireSession(req), idSchema.parse(req.params).id, updateVendorShopSchema.parse(req.body))); } catch (error) { next(error); } });
  router.post("/api/v2/vendor/workspace/kyc", writeLimit, async (req, res, next) => { try { res.status(201).json(await service.submitKyc(requireSession(req), submitVendorKycSchema.parse(req.body))); } catch (error) { next(error); } });
  router.post("/api/v2/vendor/workspace/bank-accounts", writeLimit, async (req, res, next) => { try { res.status(201).json(await service.saveBankAccount(requireSession(req), saveVendorBankAccountSchema.parse(req.body))); } catch (error) { next(error); } });
  router.get("/api/v2/vendor/workspace/staff", async (req, res, next) => { try { res.json(await service.staff(requireSession(req))); } catch (error) { next(error); } });
  router.patch("/api/v2/vendor/workspace/staff/:id", writeLimit, async (req, res, next) => { try { res.json(await service.updateStaff(requireSession(req), idSchema.parse(req.params).id, updateVendorStaffSchema.parse(req.body))); } catch (error) { next(error); } });
  router.get("/api/v2/vendor/workspace/vouchers", async (req, res, next) => { try { res.json(await service.vouchers(requireSession(req))); } catch (error) { next(error); } });
  router.post("/api/v2/vendor/workspace/vouchers", writeLimit, async (req, res, next) => { try { res.status(201).json(await service.createVoucher(requireSession(req), createVendorVoucherSchema.parse(req.body))); } catch (error) { next(error); } });
  router.get("/api/v2/vendor/workspace/report", async (req, res, next) => { try { res.json(await service.report(requireSession(req))); } catch (error) { next(error); } });
  router.get("/api/v2/vendor/workspace/returns", async (req, res, next) => { try { res.json(await service.returns(requireSession(req))); } catch (error) { next(error); } });
  router.get("/api/v2/vendor/workspace/category-requests", async (req, res, next) => { try { res.json(await service.categoryRequests(requireSession(req))); } catch (error) { next(error); } });
  router.post("/api/v2/vendor/workspace/category-requests", writeLimit, async (req, res, next) => { try { res.status(201).json(await service.createCategoryRequest(requireSession(req), createVendorCategoryRequestSchema.parse(req.body))); } catch (error) { next(error); } });
  return router;
}
