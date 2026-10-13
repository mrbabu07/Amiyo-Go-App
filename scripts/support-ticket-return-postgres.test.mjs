import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const migration = new URL("../prisma/migrations/20261013010000_support_ticket_return_relation/migration.sql", import.meta.url);

test("support return migration preserves tickets and enforces the return foreign key", async () => {
  const database = new PGlite();
  try {
    await database.exec(`
      CREATE TABLE returns (id UUID PRIMARY KEY);
      CREATE TABLE support_tickets (
        id UUID PRIMARY KEY,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      INSERT INTO returns (id) VALUES ('11111111-1111-4111-8111-111111111111');
      INSERT INTO support_tickets (id) VALUES ('22222222-2222-4222-8222-222222222222');
    `);
    await database.exec(await readFile(migration, "utf8"));
    const existing = await database.query("SELECT return_id FROM support_tickets WHERE id = '22222222-2222-4222-8222-222222222222'");
    assert.equal(existing.rows[0].return_id, null);
    await database.exec("UPDATE support_tickets SET return_id = '11111111-1111-4111-8111-111111111111' WHERE id = '22222222-2222-4222-8222-222222222222'");
    await assert.rejects(
      database.exec("UPDATE support_tickets SET return_id = '33333333-3333-4333-8333-333333333333' WHERE id = '22222222-2222-4222-8222-222222222222'"),
      /foreign key/i
    );
  } finally {
    await database.close();
  }
});
