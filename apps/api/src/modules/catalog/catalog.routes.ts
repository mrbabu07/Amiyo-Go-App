import { Router } from "express";
import { z } from "zod";
import { bulkProductCsvInputSchema, catalogQuerySchema, createProductSchema, cursorPaginationQuerySchema, inventoryAdjustmentSchema, moderationInputSchema, replaceProductMediaSchema, replaceProductVariantsSchema, updateProductSchema } from "@amiyo/contracts";
import { prisma } from "../../infrastructure/database/prisma.js";
import { FirebaseTokenVerifier } from "../identity/firebase-token.verifier.js";
import { createAuthenticationMiddleware, requireSession } from "../identity/identity.middleware.js";
import { IdentityService } from "../identity/identity.service.js";
import { CatalogService } from "./catalog.service.js";

const identifierSchema = z.object({ id: z.string().trim().min(1).max(220) });
const vendorScopeSchema = z.object({ vendorId: z.string().uuid().optional() });
const adminProductStatusSchema = z.object({ status: z.enum(["APPROVED", "ARCHIVED"]), reason: z.string().trim().min(3).max(500) });

function correlationId(headers: Record<string, unknown>) {
  const value = headers["x-correlation-id"];
  return typeof value === "string" ? value : undefined;
}

export function createCatalogRouter() {
  const router = Router();
  const service = new CatalogService(prisma);
  const authenticate = createAuthenticationMiddleware(new FirebaseTokenVerifier(), new IdentityService(prisma));

  router.get("/api/v2/catalog/categories", async (_req, res, next) => {
    try { res.json(await service.categories()); } catch (error) { next(error); }
  });

  router.get("/api/v2/catalog/products", async (req, res, next) => {
    try { res.json(await service.products(catalogQuerySchema.parse(req.query))); } catch (error) { next(error); }
  });

  router.get("/api/v2/catalog/search", async (req, res, next) => {
    try { res.json(await service.products(catalogQuerySchema.parse(req.query))); } catch (error) { next(error); }
  });

  router.get("/api/v2/catalog/products/:id", async (req, res, next) => {
    try { res.json(await service.product(identifierSchema.parse(req.params).id)); } catch (error) { next(error); }
  });

  router.get("/api/v2/shops", async (req, res, next) => {
    try {
      const query = cursorPaginationQuerySchema.parse(req.query);
      res.json(await service.shops(query.cursor, query.limit));
    } catch (error) { next(error); }
  });

  router.get("/api/v2/shops/:id", async (req, res, next) => {
    try { res.json(await service.shop(identifierSchema.parse(req.params).id, catalogQuerySchema.parse(req.query))); } catch (error) { next(error); }
  });

  router.use(["/api/v2/vendor/products", "/api/v2/vendor/inventory", "/api/v2/admin/catalog"], authenticate);

  router.post("/api/v2/vendor/products", async (req, res, next) => {
    try { res.status(201).json(await service.createProduct(requireSession(req), createProductSchema.parse(req.body), correlationId(req.headers))); } catch (error) { next(error); }
  });

  router.get("/api/v2/vendor/products", async (req, res, next) => {
    try { res.json(await service.vendorProducts(requireSession(req), vendorScopeSchema.parse(req.query).vendorId)); } catch (error) { next(error); }
  });

  router.post("/api/v2/vendor/products/import", async (req, res, next) => { try { res.status(201).json(await service.importProducts(requireSession(req), bulkProductCsvInputSchema.parse(req.body), correlationId(req.headers))); } catch (error) { next(error); } });
  router.get("/api/v2/vendor/products/export.csv", async (req, res, next) => { try { const csv = await service.exportProducts(requireSession(req), vendorScopeSchema.parse(req.query).vendorId); res.type("text/csv").attachment("amiyo-products.csv").send(csv); } catch (error) { next(error); } });

  router.get("/api/v2/vendor/inventory", async (req, res, next) => {
    try { res.json(await service.vendorInventory(requireSession(req), vendorScopeSchema.parse(req.query).vendorId)); } catch (error) { next(error); }
  });

  router.patch("/api/v2/vendor/products/:id", async (req, res, next) => {
    try { res.json(await service.updateProduct(requireSession(req), identifierSchema.parse(req.params).id, updateProductSchema.parse(req.body), correlationId(req.headers))); } catch (error) { next(error); }
  });

  router.put("/api/v2/vendor/products/:id/variants", async (req, res, next) => {
    try { res.json(await service.replaceVariants(requireSession(req), identifierSchema.parse(req.params).id, replaceProductVariantsSchema.parse(req.body), correlationId(req.headers))); } catch (error) { next(error); }
  });

  router.put("/api/v2/vendor/products/:id/media", async (req, res, next) => {
    try { res.json(await service.replaceMedia(requireSession(req), identifierSchema.parse(req.params).id, replaceProductMediaSchema.parse(req.body), correlationId(req.headers))); } catch (error) { next(error); }
  });

  router.post("/api/v2/vendor/products/:id/submit", async (req, res, next) => {
    try { res.json(await service.submitProduct(requireSession(req), identifierSchema.parse(req.params).id, correlationId(req.headers))); } catch (error) { next(error); }
  });

  router.put("/api/v2/vendor/inventory/:id", async (req, res, next) => {
    try { res.json(await service.adjustInventory(requireSession(req), identifierSchema.parse(req.params).id, inventoryAdjustmentSchema.parse(req.body), correlationId(req.headers))); } catch (error) { next(error); }
  });

  router.post("/api/v2/admin/catalog/products/:id/moderate", async (req, res, next) => {
    try { res.json(await service.moderate(requireSession(req), identifierSchema.parse(req.params).id, moderationInputSchema.parse(req.body), correlationId(req.headers))); } catch (error) { next(error); }
  });
  router.get("/api/v2/admin/catalog/products", async (req, res, next) => {
    try { res.json(await service.adminProducts(requireSession(req))); } catch (error) { next(error); }
  });
  router.patch("/api/v2/admin/catalog/products/:id", async (req, res, next) => {
    try { res.json(await service.adminUpdateProduct(requireSession(req), identifierSchema.parse(req.params).id, updateProductSchema.parse(req.body), correlationId(req.headers))); } catch (error) { next(error); }
  });
  router.patch("/api/v2/admin/catalog/products/:id/status", async (req, res, next) => {
    try { res.json(await service.setAdminProductStatus(requireSession(req), identifierSchema.parse(req.params).id, adminProductStatusSchema.parse(req.body), correlationId(req.headers))); } catch (error) { next(error); }
  });

  return router;
}
