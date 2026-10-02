import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import test from "node:test";

test("auth form exposes field labels, semantic actions and keyboard submit", async () => {
  const source = await readFile(new URL("./AuthScreen.tsx", import.meta.url), "utf8");
  assert.match(source, /TextInput accessibilityLabel=\{label\}/);
  assert.match(source, /accessibilityRole="link" accessibilityLabel="Back to shop"/);
  assert.match(source, /accessibilityRole="button" accessibilityLabel=\{mode === "login" \? "Sign in" : "Create account"\}/);
  assert.match(source, /accessibilityLabel=\{`Use \$\{account.label.toLowerCase\(\)\} demo account`\}/);
  assert.match(source, /autoComplete="email"/);
  assert.match(source, /"current-password" : "new-password"/);
  assert.match(source, /onSubmitEditing=\{\(\) => void submit\(\)\}/);
  assert.match(source, /if \(!firebaseAuth \|\| busy \|\| !email.trim\(\) \|\| password.length < 6\) return/);
  assert.match(source, /Text accessibilityRole="alert"/);
});
