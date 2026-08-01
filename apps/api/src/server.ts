import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createLogger } from "@amiyo/observability";
import { correlationMiddleware } from "./middleware/correlation.js";
import { problemMiddleware } from "./middleware/problem.js";
import { createHealthRouter } from "./modules/health/health.routes.js";
import { createIdentityRouter } from "./modules/identity/identity.routes.js";
import { createOpenApiRouter } from "./modules/openapi/openapi.routes.js";

export function createApiApp() {
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
  app.use(express.json({ limit: "1mb" }));
  app.use(correlationMiddleware);
  app.use(createHealthRouter());
  app.use(createIdentityRouter());
  app.use(createOpenApiRouter());
  app.use(problemMiddleware);

  return app;
}
