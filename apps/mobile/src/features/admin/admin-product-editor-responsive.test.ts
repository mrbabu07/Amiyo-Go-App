import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../../..");
const createScreen = readFileSync(resolve(root, "src/features/admin/AdminProductCreateScreen.tsx"), "utf8");
const editScreen = readFileSync(resolve(root, "src/features/admin/AdminProductEditScreen.tsx"), "utf8");

for (const [name, source] of [["create", createScreen], ["edit", editScreen]] as const) {
  test(`admin product ${name} controls remain usable on mobile`, () => {
    assert.match(source, /useWindowDimensions\(\)\.width < 620/);
    assert.match(source, /compact && styles\.footerCompact/);
    assert.match(source, /compact && styles\.footerButtonCompact/);
    assert.match(source, /footerButtonCompact: \{ width: "100%" \}/);
    assert.match(source, /minHeight: 44/);
    assert.match(source, /backgroundColor: colors\.background/);
  });
}
