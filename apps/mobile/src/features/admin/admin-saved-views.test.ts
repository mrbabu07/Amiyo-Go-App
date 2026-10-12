import assert from "node:assert/strict";
import test from "node:test";
import { createAdminSavedViews } from "./admin-saved-views";

function setup() {
  const values = new Map<string, string>(); let id = 0;
  const store = createAdminSavedViews({ getItem: async (key) => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); } }, async (uid) => `views:${uid}`, () => `view-${++id}`, () => new Date("2026-10-13T00:00:00.000Z"));
  return { store, values };
}

test("saved admin views remain account isolated and preserve custom dates", async () => {
  const { store } = setup();
  await store.save("admin-a", "Month close", { range: "custom", startsAt: "2026-09-01T00:00:00.000Z", endsAt: "2026-09-30T23:59:59.999Z" });
  assert.equal((await store.load("admin-a"))[0]?.name, "Month close");
  assert.deepEqual(await store.load("admin-b"), []);
});

test("saved admin views reject duplicates, overflow and corrupt storage", async () => {
  const { store, values } = setup();
  await store.save("admin", "Weekly", { range: "7d" });
  await assert.rejects(store.save("admin", " weekly ", { range: "30d" }), /already uses/);
  for (let index = 1; index < 10; index += 1) await store.save("admin", `View ${index}`, { range: "30d" });
  await assert.rejects(store.save("admin", "Overflow", { range: "90d" }), /up to 10/);
  values.set("views:broken", "not-json");
  await assert.rejects(store.load("broken"));
});

test("saved admin view removal changes only its owner", async () => {
  const { store } = setup(); const first = await store.save("admin-a", "Weekly", { range: "7d" });
  await store.save("admin-b", "Monthly", { range: "30d" });
  assert.deepEqual(await store.remove("admin-a", first[0]!.id), []);
  assert.equal((await store.load("admin-b")).length, 1);
});
