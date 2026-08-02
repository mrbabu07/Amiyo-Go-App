import assert from "node:assert/strict";

const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
if (!host) throw new Error("FIREBASE_AUTH_EMULATOR_HOST was not injected by Firebase CLI");

process.env.FIREBASE_PROJECT_ID = process.env.GCLOUD_PROJECT ?? "amiyo-app";
const email = `auth-e2e-${Date.now()}@example.test`;
const password = "LocalAuthE2e!123";
const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-emulator`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email, password, returnSecureToken: true })
});

assert.equal(response.ok, true, `Firebase Auth Emulator sign-up failed (${response.status})`);
const account = await response.json();
assert.equal(typeof account.idToken, "string");
assert.equal(typeof account.localId, "string");

const { FirebaseTokenVerifier } = await import("../apps/api/dist/modules/identity/firebase-token.verifier.js");
const verifier = new FirebaseTokenVerifier();
const identity = await verifier.verify(account.idToken);

assert.deepEqual(identity, { subject: account.localId, email });
await assert.rejects(() => verifier.verify("invalid-emulator-token"), (error) => error?.status === 401 && error?.code === "INVALID_ACCESS_TOKEN");
console.log(JSON.stringify({ service: "firebase-admin-token-verifier", status: "ok" }));
