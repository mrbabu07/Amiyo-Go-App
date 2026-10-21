import { createServer, type Server } from "node:http";
import { releaseIdentity } from "@amiyo/observability";

type HealthLogger = { info(values: Record<string, unknown>, message: string): void; warn(values: Record<string, unknown>, message: string): void };

function response(res: import("node:http").ServerResponse, statusCode: number, body: Record<string, unknown>) {
  res.writeHead(statusCode, { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

export function createWorkerHealthServer(options: { readiness(): Promise<void>; logger: HealthLogger; isShuttingDown?: () => boolean }) {
  const metadata = { service: "amiyo-worker", version: process.env.npm_package_version || "0.1.0", release: releaseIdentity() };
  return createServer(async (req, res) => {
    if (req.method !== "GET") { response(res, 405, { ...metadata, status: "method_not_allowed", checkedAt: new Date().toISOString() }); return; }
    if (req.url === "/health") { response(res, 200, { ...metadata, status: "ok", checkedAt: new Date().toISOString() }); return; }
    if (req.url !== "/ready") { response(res, 404, { ...metadata, status: "not_found", checkedAt: new Date().toISOString() }); return; }
    if (options.isShuttingDown?.()) { response(res, 503, { ...metadata, status: "not_ready", checkedAt: new Date().toISOString() }); return; }
    try {
      await options.readiness();
      response(res, 200, { ...metadata, status: "ok", checkedAt: new Date().toISOString() });
    } catch (error) {
      options.logger.warn({ error }, "Worker readiness check failed");
      response(res, 503, { ...metadata, status: "not_ready", checkedAt: new Date().toISOString() });
    }
  });
}

export async function closeWorkerHealthServer(server: Server) {
  if (!server.listening) return;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
