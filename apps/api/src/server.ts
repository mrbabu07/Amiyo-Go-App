import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createLogger } from "@amiyo/observability";
import { correlationMiddleware } from "./middleware/correlation.js";
import { problemMiddleware } from "./middleware/problem.js";
import { createHealthRouter } from "./modules/health/health.routes.js";
import { createIdentityRouter } from "./modules/identity/identity.routes.js";

export function createApiApp() {
  const app = express();
  const logger = createLogger("amiyo-api", process.env.LOG_LEVEL || "info");

  app.locals.logger = logger;
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(correlationMiddleware);
  app.use(createHealthRouter());
  app.use(createIdentityRouter());
  app.use(problemMiddleware);

  return app;
}
