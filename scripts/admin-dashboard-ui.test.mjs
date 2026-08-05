import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("admin dashboard mirrors the reference control-center hierarchy", async () => {
  const dashboard = await readFile(new URL("../apps/mobile/src/features/admin/AdminDashboardScreen.tsx", import.meta.url), "utf8");
  const route = await readFile(new URL("../apps/mobile/app/admin/dashboard.tsx", import.meta.url), "utf8");
  const screen = await readFile(new URL("../apps/mobile/src/ui/Screen.tsx", import.meta.url), "utf8");
  assert.match(route, /AdminDashboardScreen/);
  assert.match(screen, /hideHeading/);
  assert.match(dashboard, /Amiyo-Go Control Center/);
  assert.match(dashboard, /MARKETPLACE OPERATIONS/);
  assert.match(dashboard, /What needs attention/);
  assert.match(dashboard, /Marketplace performance/);
  assert.match(dashboard, /Top vendors/);
  assert.match(dashboard, /Recent platform activity/);
  assert.match(dashboard, /getAdminAnalytics/);
  assert.match(dashboard, /getAdminPlatform/);
  assert.match(dashboard, /getAdminWorkspace/);
  assert.doesNotMatch(dashboard, /Admin queues.*links\.map/s);
});
