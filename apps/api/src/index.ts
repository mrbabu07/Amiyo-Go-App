import "dotenv/config";
import { parseApiEnv } from "@amiyo/config";
import { prisma } from "./infrastructure/database/prisma.js";
import { resolveFirebaseAdminConfiguration } from "./modules/identity/firebase-admin.config.js";
import { createApiApp } from "./server.js";
import { CatalogService } from "./modules/catalog/catalog.service.js";
import { EngagementService } from "./modules/engagement/engagement.service.js";
import { closeHttpServer } from "./infrastructure/http/close-server.js";
import { configureHttpServer } from "./infrastructure/http/server-timeouts.js";
import { checkRateLimitStore, closeRateLimitStore } from "./middleware/marketplace-rate-limit.js";

const env = parseApiEnv(process.env);
const app = createApiApp({ slowRequestMs: env.API_SLOW_REQUEST_MS, readinessCheck: async () => { await prisma.$queryRaw`SELECT 1`; await checkRateLimitStore(); } });
const firebaseAdmin = resolveFirebaseAdminConfiguration(process.env);
if (firebaseAdmin.mode === "unconfigured") app.locals.logger.warn({ provider: "firebase" }, "Firebase Admin authentication is not configured");
else app.locals.logger.info({ provider: "firebase", mode: firebaseAdmin.mode }, "Firebase Admin authentication configured");
const server = app.listen(env.PORT, () => {
  app.locals.logger.info({ port: env.PORT }, "API listening");
  void (async () => {
    await new CatalogService(prisma).warmPublicCatalog();
    await new EngagementService(prisma).warmPublicGrowth();
    app.locals.logger.info("Public marketplace cache warmed");
  })().catch((error: unknown) => app.locals.logger.warn({ error }, "Public marketplace cache warmup incomplete"));
});
configureHttpServer(server, {
  requestTimeoutMs: env.HTTP_REQUEST_TIMEOUT_MS,
  headersTimeoutMs: env.HTTP_HEADERS_TIMEOUT_MS,
  keepAliveTimeoutMs: env.HTTP_KEEP_ALIVE_TIMEOUT_MS,
  maxRequestsPerSocket: env.HTTP_MAX_REQUESTS_PER_SOCKET
});

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  app.locals.logger.info({ signal }, "API shutting down");
  const result = await closeHttpServer(server, env.SHUTDOWN_TIMEOUT_MS);
  if (result.forced) app.locals.logger.warn({ signal, timeoutMs: env.SHUTDOWN_TIMEOUT_MS }, "API shutdown drain timed out; active connections were closed");
  await closeRateLimitStore();
  await prisma.$disconnect();
}

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => void shutdown(signal).then(() => process.exit(0), (error) => { app.locals.logger.fatal({ error, signal }, "API shutdown failed"); process.exit(1); }));
}
