import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter } from "node:events";
import express from "express";
import type { Request, Response } from "express";
import { requestObservabilityMiddleware } from "./request-observability.js";

test("request observability redacts query values and warns on slow responses", async () => {
  const records: Array<{ level: string; values: Record<string, unknown>; message: string }> = [];
  let time = 0;
  const app = express();
  app.locals.logger = {
    info: (values: Record<string, unknown>, message: string) => records.push({ level: "info", values, message }),
    warn: (values: Record<string, unknown>, message: string) => records.push({ level: "warn", values, message })
  };
  app.use((req, _res, next) => { req.headers["x-correlation-id"] = "request-1"; next(); });
  app.use(requestObservabilityMiddleware({ slowRequestMs: 25, now: () => time }));
  app.get("/products", (_req, res) => { time = 30; res.json({ ok: true }); });
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server address unavailable");
    assert.equal((await fetch(`http://127.0.0.1:${address.port}/products?token=private`)).status, 200);
    assert.deepEqual(records, [{
      level: "warn",
      message: "Slow API request",
      values: { method: "GET", path: "/products", statusCode: 200, durationMs: 30, completed: true, correlationId: "request-1" }
    }]);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("request observability records aborted responses once", () => {
  const records: Array<{ level: string; values: Record<string, unknown>; message: string }> = [];
  let time = 0;
  const logger = {
    info: (values: Record<string, unknown>, message: string) => records.push({ level: "info", values, message }),
    warn: (values: Record<string, unknown>, message: string) => records.push({ level: "warn", values, message })
  };
  const req = { method: "POST", path: "/checkout", headers: { "x-correlation-id": "request-2" }, app: { locals: { logger } } } as unknown as Request;
  const response = Object.assign(new EventEmitter(), { statusCode: 200, writableEnded: false }) as unknown as Response;
  requestObservabilityMiddleware({ slowRequestMs: 1_000, now: () => time })(req, response, () => undefined);
  time = 12;
  response.emit("close");
  response.emit("finish");
  assert.equal(records.length, 1);
  assert.equal(records[0]?.level, "warn");
  assert.equal(records[0]?.message, "API request aborted");
  assert.equal(records[0]?.values.completed, false);
});
