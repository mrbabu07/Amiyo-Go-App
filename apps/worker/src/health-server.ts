import { createServer, type Server } from "node:http";

type HealthLogger = { info(values: Record<string, unknown>, message: string): void; warn(values: Record<string, unknown>, message: string): void };

function response(res: import("node:http").ServerResponse, statusCode: number, body: Record<string, unknown>) {
  res.writeHead(statusCode, { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

export function createWorkerHealthServer(options: { readiness(): Promise<void>; logger: HealthLogger; isShuttingDown?: () => boolean }) {
  return createServer(async (req, res) => {
    if (req.method !== "GET") { response(res, 405, { service: "amiyo-worker", status: "method_not_allowed" }); return; }
    if (req.url === "/health") { response(res, 200, { service: "amiyo-worker", status: "ok" }); return; }
    if (req.url !== "/ready") { response(res, 404, { service: "amiyo-worker", status: "not_found" }); return; }
    if (options.isShuttingDown?.()) { response(res, 503, { service: "amiyo-worker", status: "not_ready" }); return; }
    try {
      await options.readiness();
      response(res, 200, { service: "amiyo-worker", status: "ready" });
    } catch (error) {
      options.logger.warn({ error }, "Worker readiness check failed");
      response(res, 503, { service: "amiyo-worker", status: "not_ready" });
    }
  });
}

export async function closeWorkerHealthServer(server: Server) {
  if (!server.listening) return;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
