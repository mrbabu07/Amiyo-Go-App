import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

for (const path of ["./AdminAnalyticsScreen.tsx", "./AdminAuditScreen.tsx"]) {
  test(`${path} scopes private reporting data to the active admin`, () => {
    const source = read(path);
    assert.match(source, /const user = useCurrentUser\(\)/);
    assert.match(source, /const userId = user\?\.uid \?\? null/);
    assert.match(source, /queryKey: \["admin"[^\]]*userId/);
    assert.match(source, /retry: false/);
    assert.doesNotMatch(source, /firebaseAuth/);
  });
}

for (const path of [
  "./AdminAccessScreen.tsx",
  "./AdminCategoryRequestsScreen.tsx",
  "./AdminCatalogScreen.tsx",
  "./AdminContentScreen.tsx",
  "./AdminCouponsScreen.tsx",
  "./AdminCustomersScreen.tsx"
]) {
  test(`${path} scopes data and mutations to the active admin`, () => {
    const source = read(path);
    assert.match(source, /const user = useCurrentUser\(\)/);
    assert.match(source, /userId = user\?\.uid \?\? null/);
    assert.match(source, /queryKey: \["admin"[^\]]*userId/);
    assert.match(source, /Account changed\./);
    assert.match(source, /currentActor\(\)/);
    assert.doesNotMatch(source, /firebaseAuth/);
  });
}
