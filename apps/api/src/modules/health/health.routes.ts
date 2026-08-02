import { Router } from "express";
import { healthResponseSchema } from "@amiyo/contracts";
import { prisma } from "../../infrastructure/database/prisma.js";

export type ReadinessCheck = () => Promise<void>;

const databaseReadinessCheck: ReadinessCheck = async () => {
  await prisma.$queryRaw`SELECT 1`;
};

export function createHealthRouter(readinessCheck: ReadinessCheck = databaseReadinessCheck) {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json(healthResponseSchema.parse({
      service: "amiyo-api",
      status: "ok",
      version: process.env.npm_package_version || "0.1.0",
      checkedAt: new Date().toISOString()
    }));
  });

  router.get("/ready", async (_req, res) => {
    try {
      await readinessCheck();
      res.json(healthResponseSchema.parse({
        service: "amiyo-api",
        status: "ok",
        version: process.env.npm_package_version || "0.1.0",
        checkedAt: new Date().toISOString()
      }));
    } catch {
      res.status(503).json(healthResponseSchema.parse({
        service: "amiyo-api",
        status: "not_ready",
        version: process.env.npm_package_version || "0.1.0",
        checkedAt: new Date().toISOString()
      }));
    }
  });

  return router;
}
