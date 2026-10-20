import assert from "node:assert/strict";
import test from "node:test";
import type { User } from "@firebase/auth";
import { createSession } from "./auth.api";

const session = {
  principal: { userId: "11111111-1111-4111-8111-111111111111", roles: ["VENDOR_OWNER"], vendorIds: ["22222222-2222-4222-8222-222222222222"] },
  status: "ACTIVE",
  email: "vendor@amiyo.test",
  phone: null,
  profile: { firstName: null, lastName: null, displayName: "Demo Vendor", avatarStorageKey: null, locale: "en", currency: "BDT" },
  permissions: ["orders:read"],
  vendorMemberships: [{ vendorId: "22222222-2222-4222-8222-222222222222", role: "VENDOR_OWNER", permissions: [] }]
};

test("concurrent bootstrap mounts share one session POST but completed authorization is not cached", async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  globalThis.fetch = async () => {
    requests += 1;
    await gate;
    return new Response(JSON.stringify(session), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const user = { getIdToken: async () => "demo-token" } as unknown as User;
  try {
    const first = createSession(user);
    const second = createSession(user);
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(requests, 1);
    release();
    const [firstSession, secondSession] = await Promise.all([first, second]);
    firstSession.permissions.push("invented:permission");
    assert.ok(!secondSession.permissions.includes("invented:permission"));
    await createSession(user);
    assert.equal(requests, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("different Firebase user objects never share pending authorization", async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    return new Response(JSON.stringify(session), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const first = { getIdToken: async () => "first-token" } as unknown as User;
  const second = { getIdToken: async () => "second-token" } as unknown as User;
  try {
    await Promise.all([createSession(first), createSession(second)]);
    assert.equal(requests, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
