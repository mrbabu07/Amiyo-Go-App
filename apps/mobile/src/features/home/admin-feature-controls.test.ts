import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("admin public flags control Google login and voice-search presentation", () => {
  const auth = readFileSync(new URL("../auth/AuthScreen.tsx", import.meta.url), "utf8");
  const header = readFileSync(new URL("./components/StoreHeader.tsx", import.meta.url), "utf8");
  assert.match(auth, /featureFlags\.googleLogin !== false/);
  assert.match(auth, /googleLoginEnabled && Platform\.OS === "web"/);
  assert.match(header, /featureFlags\.voiceSearch !== false/);
  assert.match(header, /voiceEnabled \? <VoiceSearchButton/);
});
