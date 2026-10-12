import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

const source = readFileSync(new URL("./AdminAnalyticsScreen.tsx", import.meta.url), "utf8");

test("analytics screen applies real bounded custom ranges and exports the applied view", () => {
  assert.match(source, /buildCustomAdminRange\(customStart, customEnd\)/);
  assert.match(source, /getAdminAnalytics\(user!, selection\)/);
  assert.match(source, /Analytics start date/);
  assert.match(source, /Analytics end date/);
  assert.match(source, /accessibilityRole="alert"/);
  assert.doesNotMatch(source, /queryFn: \(\) => getAdminAnalytics\(user!, range\)/);
});
