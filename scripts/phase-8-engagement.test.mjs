import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const baseline = new URL("../prisma/migrations/20260801153000_phase_2_baseline/migration.sql", import.meta.url);
const phase8 = new URL("../prisma/migrations/20260802043000_phase_8_engagement_growth/migration.sql", import.meta.url);
async function database() { const client = new PGlite(); await client.exec(await readFile(baseline, "utf8")); await client.exec(await readFile(phase8, "utf8")); return client; }

test("chat threads are participant-scoped and membership is unique", async () => {
  const client = await database(); const first = "80000000-0000-4000-8000-000000000001", second = "80000000-0000-4000-8000-000000000002", thread = "80000000-0000-4000-8000-000000000003";
  await client.query("INSERT INTO users (id, status, updated_at) VALUES ($1, 'ACTIVE', now()), ($2, 'ACTIVE', now())", [first, second]); await client.query("INSERT INTO chat_threads (id, subject, updated_at) VALUES ($1, 'Order question', now())", [thread]); await client.query("INSERT INTO chat_participants (thread_id, user_id, role) VALUES ($1, $2, 'customer')", [thread, first]);
  const visible = await client.query("SELECT t.id FROM chat_threads t JOIN chat_participants p ON p.thread_id = t.id WHERE p.user_id = $1", [first]); const hidden = await client.query("SELECT t.id FROM chat_threads t JOIN chat_participants p ON p.thread_id = t.id WHERE p.user_id = $1", [second]); assert.equal(visible.rows.length, 1); assert.equal(hidden.rows.length, 0); await assert.rejects(() => client.query("INSERT INTO chat_participants (thread_id, user_id, role) VALUES ($1, $2, 'customer')", [thread, first])); await client.close();
});

test("notification event keys deduplicate retries", async () => {
  const client = await database(); const user = "81000000-0000-4000-8000-000000000001"; await client.query("INSERT INTO users (id, status, updated_at) VALUES ($1, 'ACTIVE', now())", [user]); const insert = "INSERT INTO notifications (id, user_id, type, title, body, idempotency_key) VALUES (gen_random_uuid(), $1, 'question.answered', 'Answered', 'Body', 'answer:one')"; await client.query(insert, [user]); await assert.rejects(() => client.query(insert, [user])); await client.close();
});

test("loyalty ledger forbids negative balances and zero-value effects", async () => {
  const client = await database(); const user = "82000000-0000-4000-8000-000000000001", account = "82000000-0000-4000-8000-000000000002"; await client.query("INSERT INTO users (id, status, updated_at) VALUES ($1, 'ACTIVE', now())", [user]); await client.query("INSERT INTO loyalty_accounts (id, user_id, points_balance, updated_at) VALUES ($1, $2, 0, now())", [account, user]); await assert.rejects(() => client.query("UPDATE loyalty_accounts SET points_balance = -1 WHERE id = $1", [account])); await assert.rejects(() => client.query("INSERT INTO loyalty_transactions (id, account_id, points, entry_type, reference_type, reference_id, idempotency_key) VALUES (gen_random_uuid(), $1, 0, 'EARN', 'order', 'one', 'loyalty:one')", [account])); await client.close();
});

test("engagement writes have explicit abuse limits", async () => {
  const source = await readFile(new URL("../apps/api/src/modules/engagement/engagement.routes.ts", import.meta.url), "utf8"); assert.match(source, /windowMs: 60_000, limit: 20/); assert.match(source, /windowMs: 60_000, limit: 30/); assert.match(source, /ENGAGEMENT_RATE_LIMITED/); assert.match(source, /CHAT_RATE_LIMITED/);
});
