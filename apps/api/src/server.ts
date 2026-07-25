import cors from "cors";
import express from "express";
import helmet from "helmet";
import { healthResponseSchema } from "@amiyo/contracts";
import { createCorrelationId, correlationHeader, createLogger } from "@amiyo/observability";

export function createApiApp() {
  const app = express();
  const logger = createLogger("amiyo-api", process.env.LOG_LEVEL || "info");

  app.locals.logger = logger;
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use((req, res, next) => {
    const correlationId = createCorrelationId(req.headers[correlationHeader]);
    res.setHeader(correlationHeader, correlationId);
    req.headers[correlationHeader] = correlationId;
    next();
  });

  app.get("/health", (_req, res) => {
    res.json(healthResponseSchema.parse({
      service: "amiyo-api",
      status: "ok",
      version: process.env.npm_package_version || "0.1.0",
      checkedAt: new Date().toISOString()
    }));
  });

  app.get("/ready", (_req, res) => {
    res.json(healthResponseSchema.parse({
      service: "amiyo-api",
      status: "ok",
      version: process.env.npm_package_version || "0.1.0",
      checkedAt: new Date().toISOString()
    }));
  });

  app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const correlationId = String(req.headers[correlationHeader] || "");
    logger.error({ error, correlationId }, "Unhandled API error");
    res.status(500).json({
      type: "https://api.amiyo-go.local/problems/internal-error",
      title: "Internal server error",
      status: 500,
      code: "INTERNAL_ERROR",
      correlationId
    });
  });

  return app;
}
