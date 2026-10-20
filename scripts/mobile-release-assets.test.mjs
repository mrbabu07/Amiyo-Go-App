import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("mobile release config includes branded launcher and splash assets", async () => {
  const config = JSON.parse(await readFile(new URL("apps/mobile/app.json", root), "utf8"));
  const expo = config.expo;
  assert.equal(expo.icon, "./assets/amiyo-icon.png");
  assert.equal(expo.android.adaptiveIcon.foregroundImage, "./assets/amiyo-adaptive-foreground.png");
  assert.equal(expo.android.adaptiveIcon.backgroundColor, "#FAF7F0");
  assert.equal(expo.web.favicon, "./assets/amiyo-icon.png");
  const splash = expo.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === "expo-splash-screen");
  assert.ok(splash);
  assert.equal(splash[1].image, "./assets/amiyo-adaptive-foreground.png");
  await Promise.all([
    access(new URL("apps/mobile/assets/amiyo-icon.png", root)),
    access(new URL("apps/mobile/assets/amiyo-adaptive-foreground.png", root))
  ]);
});

test("production readiness requires both native brand assets", async () => {
  const checker = await readFile(new URL("scripts/release-readiness.mjs", root), "utf8");
  assert.match(checker, /apps\/mobile\/assets\/amiyo-icon\.png/);
  assert.match(checker, /apps\/mobile\/assets\/amiyo-adaptive-foreground\.png/);
});
