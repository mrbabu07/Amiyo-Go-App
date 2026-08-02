import "dotenv/config";
import { parseApiEnv } from "@amiyo/config";
import { prisma } from "./infrastructure/database/prisma.js";
import { resolveFirebaseAdminConfiguration } from "./modules/identity/firebase-admin.config.js";
import { createApiApp } from "./server.js";

const env = parseApiEnv(process.env);
const app = createApiApp();
const firebaseAdmin = resolveFirebaseAdminConfiguration(process.env);
if (firebaseAdmin.mode === "unconfigured") app.locals.logger.warn({ provider: "firebase" }, "Firebase Admin authentication is not configured");
else app.locals.logger.info({ provider: "firebase", mode: firebaseAdmin.mode }, "Firebase Admin authentication configured");
const server = app.listen(env.PORT, () => {
  app.locals.logger.info({ port: env.PORT }, "API listening");
});

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  app.locals.logger.info({ signal }, "API shutting down");
  server.closeIdleConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.$disconnect();
}

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => void shutdown(signal).then(() => process.exit(0)));
}
