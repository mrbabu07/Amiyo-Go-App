import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("dark mode is global, adaptive, and persisted", async () => {
  const [layout, provider, store, toggle, tokens, header, screen] = await Promise.all([
    readFile(new URL("../apps/mobile/app/_layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/mobile/src/ui/ThemeProvider.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/mobile/src/ui/theme.store.ts", import.meta.url), "utf8"),
    readFile(new URL("../apps/mobile/src/ui/ThemeToggle.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/mobile/src/ui/tokens.ts", import.meta.url), "utf8"),
    readFile(new URL("../apps/mobile/src/features/home/components/StoreHeader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/mobile/src/ui/Screen.tsx", import.meta.url), "utf8")
  ]);

  assert.match(layout, /<ThemeProvider>/);
  assert.match(store, /createJSONStorage\(\(\) => AsyncStorage\)/);
  assert.match(store, /name: "amiyo-theme"/);
  assert.match(store, /mode: "system"/);
  assert.match(provider, /Appearance\.setColorScheme/);
  assert.match(provider, /root\.style\.setProperty/);
  assert.match(tokens, /DynamicColorIOS/);
  assert.match(tokens, /PlatformColor/);
  assert.match(tokens, /--amiyo-/);
  assert.match(toggle, /accessibilityLabel/);
  assert.match(toggle, /mode === "system"/);
  assert.match(header, /<ThemeToggle \/>/);
  assert.match(screen, /<ThemeToggle compact \/>/);
});
