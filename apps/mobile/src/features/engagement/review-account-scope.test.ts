import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

test("personal review history subscribes to identity and scopes its cache to the account", () => {
  const source = readFileSync(new URL("./MyReviewsScreen.tsx", import.meta.url), "utf8");
  assert.match(source, /const user = useCurrentUser\(\)/);
  assert.match(source, /queryKey: \["reviews", "mine", user\?\.uid\]/);
  assert.match(source, /enabled: Boolean\(user\), retry: false/);
  assert.match(source, /if \(!user\) return <ReviewState/);
  assert.doesNotMatch(source, /firebaseAuth|placeholderData|keepPreviousData/);
  assert.match(source, /useWindowDimensions\(\)\.width < 620/);
  assert.match(source, /compact && styles\.summaryCompact/);
  assert.match(source, /compact && styles\.summaryDividerCompact/);
  assert.match(source, /minHeight: 44/);
});
