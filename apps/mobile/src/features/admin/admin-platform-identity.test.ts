import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

const mutationScreens = [
  "./AdminBannersScreen.tsx",
  "./AdminCategoryAttributesScreen.tsx",
  "./AdminPlatformScreen.tsx",
  "./AdminReferenceWorkspaceScreen.tsx"
];

for (const path of mutationScreens) {
  test(`${path} scopes private admin data and writes to the active account`, () => {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(source, /const user = useCurrentUser\(\)/);
    assert.match(source, /const userId = user\?\.uid \?\? null/);
    assert.match(source, /queryKey: \["admin"[^\]]*userId/);
    assert.match(source, /Account changed\./);
    assert.doesNotMatch(source, /firebaseAuth/);
  });
}

test("admin dashboard scopes remote and local views to the active account", () => {
  const source = readFileSync(new URL("./AdminDashboardScreen.tsx", import.meta.url), "utf8");
  assert.match(source, /const user = useCurrentUser\(\)/);
  assert.match(source, /const userIdRef = useRef\(userId\)/);
  assert.match(source, /queryKey: \["admin", "workspace", userId\]/);
  assert.match(source, /queryKey: \["admin", "platform", userId\]/);
  assert.match(source, /queryKey: \["admin", "analytics", userId/);
  assert.match(source, /queryKey: \["admin", "queues", userId\]/);
  assert.match(source, /userIdRef\.current === uid/);
  assert.doesNotMatch(source, /firebaseAuth/);
});
