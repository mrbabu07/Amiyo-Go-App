import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("remembered login is bounded to a non-sliding 60 day window", async () => {
  const nativeMarker = await readFile(new URL("../apps/mobile/src/features/auth/session-marker.ts", import.meta.url), "utf8");
  const webMarker = await readFile(new URL("../apps/mobile/src/features/auth/session-marker.web.ts", import.meta.url), "utf8");
  for (const source of [nativeMarker, webMarker]) {
    assert.match(source, /60 \* 24 \* 60 \* 60_000/);
    assert.match(source, /marker\.expiresAt > now/);
    assert.match(source, /marker\.expiresAt <= now/);
    assert.match(source, /issuedAt: now, expiresAt: now \+ sessionDurationMs/);
  }
});

test("invalid API access tokens refresh once before clean sign-out", async () => {
  const retry = await readFile(new URL("../apps/mobile/src/features/auth/auth-fetch.ts", import.meta.url), "utf8");
  const bootstrap = await readFile(new URL("../apps/mobile/src/features/auth/AuthBootstrap.tsx", import.meta.url), "utf8");
  assert.match(retry, /problem\?\.code === "INVALID_ACCESS_TOKEN"/);
  assert.match(retry, /user\.getIdToken\(true\)/);
  assert.match(retry, /const retried = await originalFetch/);
  assert.match(retry, /if \(await invalidAccessToken\(retried\)\) await signOut\(auth\)/);
  assert.match(bootstrap, /installAuthenticatedFetchRetry\(auth\)/);
  assert.match(bootstrap, /ensureSessionMarker\(user\.uid\)/);
});
