import { Router } from "express";
import { healthResponseSchema } from "@amiyo/contracts";

export function createHealthRouter() {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json(healthResponseSchema.parse({
      service: "amiyo-api",
      status: "ok",
      version: process.env.npm_package_version || "0.1.0",
      checkedAt: new Date().toISOString()
    }));
  });

  router.get("/ready", (_req, res) => {
    res.json(healthResponseSchema.parse({
      service: "amiyo-api",
      status: "ok",
      version: process.env.npm_package_version || "0.1.0",
      checkedAt: new Date().toISOString()
    }));
  });

  return router;
}
