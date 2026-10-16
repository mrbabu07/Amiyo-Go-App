import assert from "node:assert/strict";
import test from "node:test";
import type { Server } from "node:http";
import { closeHttpServer } from "./close-server.js";

test("HTTP shutdown drains idle connections without forcing active sockets", async () => {
  let idleClosed = false;
  let forced = false;
  const server = {
    closeIdleConnections: () => { idleClosed = true; },
    closeAllConnections: () => { forced = true; },
    close: (callback: (error?: Error) => void) => { callback(); return server; }
  } as unknown as Server;
  assert.deepEqual(await closeHttpServer(server, 100), { forced: false });
  assert.equal(idleClosed, true);
  assert.equal(forced, false);
});

test("HTTP shutdown force closes connections after the bounded drain window", async () => {
  let forced = false;
  const server = {
    closeIdleConnections: () => undefined,
    closeAllConnections: () => { forced = true; },
    close: () => server
  } as unknown as Server;
  assert.deepEqual(await closeHttpServer(server, 5), { forced: true });
  assert.equal(forced, true);
});
