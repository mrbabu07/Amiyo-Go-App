import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./VendorSettingsScreen.tsx", import.meta.url), "utf8");

test("seller notification matrix is persisted and truthful about providers", () => {
  for (const label of ["New order", "Shipment SLA", "Return request", "Payout update", "Low stock", "Campaign alert", "Customer message"]) assert.match(source, new RegExp(label));
  assert.match(source, /notificationPreferences/);
  assert.match(source, /Save notifications/);
  assert.match(source, /Push preferences are active for every event below/);
  assert.doesNotMatch(source, />Planned</);
  assert.match(source, /accessibilityRole="switch"/);
});
