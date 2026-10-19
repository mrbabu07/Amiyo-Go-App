import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("admin order detail carries and renders product thumbnails with a fallback", async () => {
  const [screen, service, contract] = await Promise.all([
    readFile(new URL("./AdminOrderDetailScreen.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../../api/src/modules/admin/admin.service.ts", import.meta.url), "utf8"),
    readFile(new URL("../../../../../packages/contracts/src/admin.ts", import.meta.url), "utf8")
  ]);
  assert.match(contract, /thumbnailUrl: z\.string\(\)\.url\(\)\.nullable\(\)/);
  assert.match(service, /thumbnailUrl: mediaUrl\(item\.product\?\.media\[0\]\?\.storageKey \?\? null\)/);
  assert.match(screen, /item\.thumbnailUrl \? <Image/);
  assert.match(screen, /accessibilityLabel=\{item\.productName\}/);
  assert.match(screen, /styles\.itemImage/);
  assert.match(screen, /name="cube-outline"/);
});
