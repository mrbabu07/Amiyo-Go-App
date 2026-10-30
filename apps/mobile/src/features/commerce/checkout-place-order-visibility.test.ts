import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("checkout keeps place order visible in a persistent compact action bar", () => {
  const source = readFileSync(new URL("./CheckoutScreen.tsx", import.meta.url), "utf8");

  assert.match(source, /compact \? <><View style=\{styles\.mobileCheckoutSpacer\} \/><View style=\{styles\.mobileCheckoutBar\}/);
  assert.match(source, /position: Platform\.OS === "web" \? "fixed" : "relative"/);
  assert.match(source, /<OrderButton busy=\{busy\} disabled=\{submitDisabled\}/);
  assert.match(source, /primaryDisabled: \{ backgroundColor: colors\.muted, opacity: 0\.72 \}/);
  assert.match(source, /primaryText: \{ color: colors\.onPrimary/);
  assert.match(source, /Confirm active delivery phone for COD/);
  assert.match(source, /blockingReason/);
  assert.match(source, /mobileCheckoutSpacer: \{ height: 132 \}/);
});
