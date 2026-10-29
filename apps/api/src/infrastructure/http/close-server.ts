import type { Server } from "node:http";

export async function closeHttpServer(server: Server, timeoutMs: number) {
  let forced = false;
  let settled = false;
  server.closeIdleConnections();
  await new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    };
    const timer = setTimeout(() => {
      forced = true;
      server.closeAllConnections();
      finish();
    }, timeoutMs);
    server.close((error) => finish(error));
  });
  return { forced };
}
