import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createLogger } from "@amiyo/observability";
import { correlationMiddleware } from "./middleware/correlation.js";
import { problemMiddleware } from "./middleware/problem.js";
import { createHealthRouter } from "./modules/health/health.routes.js";
import { createIdentityRouter } from "./modules/identity/identity.routes.js";
import { createOpenApiRouter } from "./modules/openapi/openapi.routes.js";
import { createCatalogRouter } from "./modules/catalog/catalog.routes.js";
import { createCommerceRouter } from "./modules/commerce/commerce.routes.js";
import { createOrderRouter } from "./modules/orders/order.routes.js";
import { createOperationsRouter } from "./modules/operations/operations.routes.js";
import { createEngagementRouter } from "./modules/engagement/engagement.routes.js";
import { createSupportRouter } from "./modules/support/support.routes.js";
import { createVendorRouter } from "./modules/vendor/vendor.routes.js";
import { createAdminRouter } from "./modules/admin/admin.routes.js";
import type { ReadinessCheck } from "./modules/health/health.routes.js";

export function createApiApp(options: { readinessCheck?: ReadinessCheck } = {}) {
  const app = express();
  const logger = createLogger("amiyo-api", process.env.LOG_LEVEL || "info");
  const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:8081,http://localhost:19006")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.locals.logger = logger;
  app.disable("x-powered-by");
  app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS || 1));
  app.use(helmet());
  app.use(cors({
    credentials: true,
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.includes(origin));
    }
  }));
  app.use(express.json({ limit: "1mb", verify(req, _res, buffer) { (req as express.Request).rawBody = Buffer.from(buffer); } }));
  app.use(correlationMiddleware);
  app.use(createHealthRouter(options.readinessCheck));
  app.use(createIdentityRouter());
  app.use(createCatalogRouter());
  app.use(createCommerceRouter());
  app.use(createOrderRouter());
  app.use(createOperationsRouter());
  app.use(createEngagementRouter());
  app.use(createSupportRouter());
  app.use(createVendorRouter());
  app.use(createAdminRouter());
  app.use(createOpenApiRouter());
  app.use(problemMiddleware);

  return app;
}
