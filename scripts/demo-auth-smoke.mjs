import assert from "node:assert/strict";

await import("./seed-firebase-demo-users.mjs");

const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
if (!host) throw new Error("FIREBASE_AUTH_EMULATOR_HOST was not injected by Firebase CLI");

const password = "AmiyoDemo123!";
const accounts = [
  ["customer@amiyo.test", "amiyo-demo-customer"],
  ["vendor@amiyo.test", "amiyo-demo-vendor"],
  ["admin@amiyo.test", "amiyo-demo-admin"]
];

for (const [email, expectedUserId] of accounts) {
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-emulator`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  assert.equal(response.ok, true, `${email} could not sign in (${response.status})`);
  const identity = await response.json();
  assert.equal(identity.localId, expectedUserId);
  assert.equal(typeof identity.idToken, "string");
}

console.log(JSON.stringify({ service: "demo-role-auth", accounts: accounts.length, status: "ok" }));
