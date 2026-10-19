import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

test("alert list links to the product and identifies which subscription is removed", () => {
  const source = readFileSync(new URL("./AlertsScreen.tsx", import.meta.url), "utf8");
  assert.match(source, /accessibilityRole="link" accessibilityLabel=\{`View/);
  assert.match(source, /\/product\/\$\{item.productId\}/);
  assert.match(source, /Turn off \$\{item.target \? "price" : "stock"\} alert/);
  assert.match(source, /removeAlert\(user, item.productId, item.target \? "price" : "stock"\)/);
  assert.match(source, /alertMinorToPrice\(minor\)/);
  assert.match(source, /compact = useWindowDimensions\(\).width < 600/);
  assert.match(source, /compact && styles.removeCompact/);
  assert.match(source, /priceCount/);
  assert.match(source, /stockCount/);
  assert.match(source, /compact && alertStyles\.summaryCompact/);
  assert.match(source, /remove\.variables\?\.id === item\.id/);
  assert.match(source, /PRICE ALERT/);
});

for (const path of ["./AlertsScreen.tsx", "../catalog/ProductDetailScreen.tsx"]) {
  test(`${path} isolates alert queries and mutation results by account`, () => {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(source, /const user = useCurrentUser\(\)/);
    assert.match(source, /queryKey: \["alerts", user\?\.uid \?\? null\]/);
    assert.match(source, /activeUid\.current !== user.uid/);
    assert.match(source, /return \{ data, uid: user.uid \}/);
    assert.match(source, /if \(activeUid\.current !== uid\) return/);
    assert.match(source, /setQueryData\(\["alerts", uid\], data\)/);
    assert.doesNotMatch(source, /\["alerts"\]/);
    if (path === "./AlertsScreen.tsx") assert.doesNotMatch(source, /firebaseAuth/);
  });
}
