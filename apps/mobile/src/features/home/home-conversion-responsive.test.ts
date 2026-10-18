import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const heroSource = readFileSync(new URL("../catalog/MarketplacePageHero.tsx", import.meta.url), "utf8");
const deliverySource = readFileSync(new URL("./components/DeliveryAvailability.tsx", import.meta.url), "utf8");
const newsletterSource = readFileSync(new URL("./components/NewsletterSignup.tsx", import.meta.url), "utf8");

test("storefront conversion blocks adapt to compact screens", () => {
  assert.match(heroSource, /useWindowDimensions\(\)\.width < 620/);
  assert.match(heroSource, /compact && styles\.titleCompact/);
  assert.match(deliverySource, /compact && styles\.fieldsCompact/);
  assert.match(deliverySource, /compact && styles\.buttonCompact/);
  assert.match(newsletterSource, /compact && styles\.cardCompact/);
  assert.match(newsletterSource, /compact && styles\.formCompact/);
});

test("storefront conversion blocks use brand tokens and clean copy", () => {
  assert.doesNotMatch(newsletterSource, /#eef6ff|#bfdbfe/i);
  assert.doesNotMatch(`${deliverySource}${newsletterSource}`, /â€¦|à§³|Â·|â€“/);
  assert.match(deliverySource, /Checking…/);
  assert.match(newsletterSource, /Subscribing…/);
});
