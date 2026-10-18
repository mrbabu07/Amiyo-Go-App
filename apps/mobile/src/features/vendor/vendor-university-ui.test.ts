import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync(new URL("./VendorUniversityScreen.tsx", import.meta.url), "utf8");
const lessons = readFileSync(new URL("./vendor-university.data.ts", import.meta.url), "utf8");

test("seller university preserves clean bilingual learning content", () => {
  assert.match(screen, /EN \+ বাংলা/);
  assert.match(screen, /আপনার পছন্দের ভাষা বেছে নিন/);
  assert.match(lessons, /অনবোর্ডিং, KYC ও শপ প্রস্তুতি/);
  assert.match(lessons, /পণ্য, ভ্যারিয়েন্ট ও ইনভেন্টরি/);
  assert.match(lessons, /ফাইন্যান্স, পেআউট, মার্কেটিং ও সুনাম/);
  assert.doesNotMatch(`${screen}${lessons}`, /à¦|à§|â€|Â/);
});

test("seller university remains mobile friendly and operational", () => {
  assert.match(screen, /useWindowDimensions\(\)\.width < 720/);
  assert.match(screen, /compact && styles\.heroCompact/);
  assert.match(screen, /compact && styles\.linksCompact/);
  assert.match(screen, /accessibilityRole="radio"/);
  assert.match(screen, /accessibilityRole="link"/);
  assert.match(lessons, /href: "\/vendor\/orders"/);
  assert.match(lessons, /href: "\/vendor\/finance"/);
});
