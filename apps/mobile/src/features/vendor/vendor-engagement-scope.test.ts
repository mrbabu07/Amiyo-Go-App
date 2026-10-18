import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const questions = readFileSync(new URL("./VendorQuestionsScreen.tsx", import.meta.url), "utf8");
const reviews = readFileSync(new URL("./VendorReviewsScreen.tsx", import.meta.url), "utf8");

test("seller question replies stay scoped to the active account", () => {
  assert.match(questions, /useCurrentUser\(\)/);
  assert.match(questions, /\["vendor", "questions", user\?\.uid\]/);
  assert.match(questions, /owner: User/);
  assert.match(questions, /activeUid\.current !== variables\.owner\.uid/);
  assert.match(questions, /setEditingId\(null\)/);
  assert.doesNotMatch(questions, /firebaseAuth\?\.currentUser/);
});

test("seller review replies stay scoped to the active account", () => {
  assert.match(reviews, /useCurrentUser\(\)/);
  assert.match(reviews, /\["vendor", "reviews", user\?\.uid\]/);
  assert.match(reviews, /owner: User/);
  assert.match(reviews, /activeUid\.current !== variables\.owner\.uid/);
  assert.match(reviews, /setReply\(""\)/);
  assert.doesNotMatch(reviews, /firebaseAuth\?\.currentUser/);
});

test("seller trust screens use responsive premium reputation summaries", () => {
  for (const source of [questions, reviews]) {
    assert.match(source, /responseRate/);
    assert.match(source, /compact && styles\.heroCompact/);
    assert.match(source, /backgroundColor: colors\.navy/);
    assert.doesNotMatch(source, /#fff|Â|â/);
  }
  assert.match(questions, /BUYER CONFIDENCE/);
  assert.match(reviews, /STORE REPUTATION/);
});
