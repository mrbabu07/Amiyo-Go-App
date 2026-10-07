import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

for (const path of ["./AlertsScreen.tsx", "../catalog/ProductDetailScreen.tsx"]) {
  test(`${path} isolates alert queries and mutation results by account`, () => {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(source, /const user = useCurrentUser\(\)/);
    assert.match(source, /queryKey: \["alerts", user\?\.uid \?\? null\]/);
    assert.match(source, /firebaseAuth\?\.currentUser\?\.uid !== user.uid/);
    assert.match(source, /return \{ data, uid: user.uid \}/);
    assert.match(source, /if \(firebaseAuth\?\.currentUser\?\.uid !== uid\) return/);
    assert.match(source, /setQueryData\(\["alerts", uid\], data\)/);
    assert.doesNotMatch(source, /\["alerts"\]/);
  });
}
