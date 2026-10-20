import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { configureHttpServer } from "./server-timeouts.js";

test("HTTP server limits are applied before accepting production traffic", () => {
  const server = createServer();
  configureHttpServer(server, { requestTimeoutMs: 30_000, headersTimeoutMs: 15_000, keepAliveTimeoutMs: 5_000, maxRequestsPerSocket: 1_000 });
  assert.equal(server.requestTimeout, 30_000);
  assert.equal(server.headersTimeout, 15_000);
  assert.equal(server.keepAliveTimeout, 5_000);
  assert.equal(server.maxRequestsPerSocket, 1_000);
});
