import { Router } from "express";
import { createOpenApiDocument } from "@amiyo/contracts";

export function createOpenApiRouter() {
  const router = Router();
  router.get("/openapi.json", (_req, res) => res.json(createOpenApiDocument()));
  return router;
}
