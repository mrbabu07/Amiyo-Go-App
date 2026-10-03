import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./CustomerOrderDetailScreen.tsx", import.meta.url), "utf8");

test("order action state remounts for account and route changes", () => {
  assert.match(source, /ScopedOrderDetailScreen key=\{`\$\{id\}:\$\{user\?\.uid/);
  assert.match(source, /mounted\.current = false/);
  assert.match(source, /firebaseAuth\?\.currentUser\?\.uid === user\?\.uid/);
});

test("cancel and return gate submission and completion on the current account", () => {
  assert.equal((source.match(/if \(!actionIsCurrent\(\)\) throw/g) ?? []).length, 2);
  assert.equal((source.match(/onSuccess: async \(\) => \{ if \(!actionIsCurrent\(\)\) return/g) ?? []).length, 2);
  assert.match(source, /await cache\.invalidateQueries\(\{ queryKey: \["returns"\] \}\); if \(actionIsCurrent\(\)\) router\.push/);
});
