import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { alertMinorToPrice, alertPriceToMinor } from "./alert-price";

test("target price input accepts English and Bangla digits without floating-point loss", () => {
  for (const [input, expected] of [[" 500 ", "50000"], ["৫০০.৫০", "50050"], ["0.01", "1"], ["0001.5", "150"], ["92233720368547758.07", "9223372036854775807"]]) {
    assert.equal(alertPriceToMinor(input!), expected);
    assert.equal(alertPriceToMinor(alertMinorToPrice(expected!)), expected);
  }
});

test("invalid decimal and oversized prices fail instead of changing the saved rule", () => {
  for (const value of ["", "0", "0.00", "-5", "Infinity", "NaN", "1e3", "1,000", "1.001", "1.", "92233720368547758.08"]) {
    assert.throws(() => alertPriceToMinor(value), /price/);
  }
});

test("wishlist alert editor exposes labeled controls outside product navigation", () => {
  const editor = readFileSync(new URL("./ProductAlertControls.tsx", import.meta.url), "utf8");
  const wishlist = readFileSync(new URL("./WishlistScreen.tsx", import.meta.url), "utf8");
  assert.match(editor, /key=\{`\$\{user.uid\}:\$\{productId\}`\}/);
  assert.match(editor, /queryKey: \["alerts", user\?\.uid \?\? null\]/);
  assert.match(editor, /firebaseAuth\?\.currentUser\?\.uid !== user.uid/);
  assert.match(editor, /firebaseAuth\?\.currentUser\?\.uid !== uid/);
  assert.match(editor, /retry: false/);
  assert.match(editor, /alertPriceToMinor\(value\)/);
  assert.match(editor, /Saving replaces the current rule/);
  assert.match(editor, /accessibilityLabel=\{`Target price in BDT/);
  assert.match(wishlist, /<ProductAlertControls productId=\{item.productId\} productName=\{item.name\}/);
});
