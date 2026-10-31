import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";
import { test } from "node:test";

const screen = readFileSync(new URL("./AdminNotificationInboxScreen.tsx", import.meta.url), "utf8");
const shell = readFileSync(new URL("../../ui/Screen.tsx", import.meta.url), "utf8");

test("admin notification inbox shows notification details and marks items read", () => {
  assert.match(screen, /item\.title/);
  assert.match(screen, /item\.body/);
  assert.match(screen, /item\.createdAt/);
  assert.match(screen, /readNotification\(user, id\)/);
});

test("admin notification navigation uses the inbox and sidebar badge", () => {
  assert.match(shell, /open\("\/admin\/notification-inbox"\)/);
  assert.match(shell, /label: "Notifications", href: "\/admin\/notification-inbox"/);
  assert.match(shell, /badgeCount=\{link\.href === "\/admin\/notification-inbox" \? notificationCount : 0\}/);
});
