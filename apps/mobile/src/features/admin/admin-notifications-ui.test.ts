import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../../..");
const screen = readFileSync(resolve(root, "src/features/admin/AdminNotificationsScreen.tsx"), "utf8");
const route = readFileSync(resolve(root, "app/admin/notifications.tsx"), "utf8");
const api = readFileSync(resolve(root, "src/features/engagement/engagement.api.ts"), "utf8");

test("admin notifications use the audited broadcast workspace", () => {
  assert.match(route, /AdminNotificationsScreen/);
  assert.doesNotMatch(route, /NotificationsScreen from/);
  assert.match(screen, /\["admin", "notifications", user\?\.uid\]/);
  assert.match(screen, /accessibilityRole="radiogroup"/);
  assert.match(screen, /accessibilityRole="checkbox"/);
  assert.match(screen, /randomUUID\(\)/);
  assert.match(screen, /Email and SMS are not offered here/);
  assert.match(screen, /metricCompact/);
  assert.match(screen, /Order update/);
  assert.match(screen, /Payout update/);
  assert.match(screen, /Seller approval/);
  assert.match(screen, /Campaign/);
  assert.match(screen, /Account changed\. Reopen notification management/);
  assert.match(screen, /createAdminNotificationBroadcast\(currentActor\(\)/);
  assert.match(api, /getAdminNotificationWorkspace/);
  assert.match(api, /createAdminNotificationBroadcast/);
  assert.doesNotMatch(screen, /#fff\b/i);
});
