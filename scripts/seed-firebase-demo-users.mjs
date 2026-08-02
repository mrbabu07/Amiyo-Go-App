import assert from "node:assert/strict";

const host = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
assert.match(host, /^(127\.0\.0\.1|localhost):\d+$/, "Demo users may only be created in a loopback Firebase Auth Emulator");
process.env.FIREBASE_AUTH_EMULATOR_HOST = host;

const { getApps, initializeApp } = await import("firebase-admin/app");
const { getAuth } = await import("firebase-admin/auth");
const app = getApps()[0] || initializeApp({ projectId: "amiyo-app" });
const auth = getAuth(app);
const password = "AmiyoDemo123!";
const accounts = [
  { uid: "amiyo-demo-customer", email: "customer@amiyo.test", displayName: "Demo Customer", role: "CUSTOMER" },
  { uid: "amiyo-demo-vendor", email: "vendor@amiyo.test", displayName: "Demo Vendor", role: "VENDOR_OWNER" },
  { uid: "amiyo-demo-admin", email: "admin@amiyo.test", displayName: "Demo Admin", role: "SUPER_ADMIN" }
];

for (const account of accounts) {
  try {
    await auth.updateUser(account.uid, { email: account.email, password, displayName: account.displayName, disabled: false, emailVerified: true });
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
    await auth.createUser({ uid: account.uid, email: account.email, password, displayName: account.displayName, emailVerified: true });
  }
}

console.table(accounts.map(({ email, role }) => ({ role, email, password })));
