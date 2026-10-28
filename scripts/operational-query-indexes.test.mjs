import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schemaUrl = new URL("../prisma/schema.prisma", import.meta.url);
const migrationUrl = new URL("../prisma/migrations/20261027010000_operational_query_indexes/migration.sql", import.meta.url);
const notificationMigrationUrl = new URL("../prisma/migrations/20261028221500_notification_feed_index/migration.sql", import.meta.url);

test("operational scans keep compound database indexes", async () => {
  const [schema, migration, notificationMigration] = await Promise.all([readFile(schemaUrl, "utf8"), readFile(migrationUrl, "utf8"), readFile(notificationMigrationUrl, "utf8")]);
  const schemaIndexes = [
    "@@index([status, updatedAt])",
    "@@index([eventType, status, availableAt, createdAt], map: \"outbox_events_relay_scan_idx\")",
    "@@index([vendorId, updatedAt])",
    "@@index([status, name])",
    "@@index([status, createdAt])",
    "@@index([broadcastId, status])"
  ];
  for (const index of schemaIndexes) assert.ok(schema.includes(index), `Missing schema index ${index}`);
  const databaseIndexes = [
    "carts_status_updated_at_idx",
    "outbox_events_relay_scan_idx",
    "products_vendor_id_updated_at_idx",
    "vendor_kyc_submissions_status_created_at_idx",
    "payment_verifications_status_created_at_idx",
    "newsletter_deliveries_broadcast_id_status_idx"
  ];
  for (const index of databaseIndexes) assert.match(migration, new RegExp(`CREATE INDEX "${index}"`));
  assert.ok(schema.includes("@@index([userId, createdAt])"), "Missing notification timeline schema index");
  assert.match(notificationMigration, /CREATE INDEX "notifications_user_id_created_at_idx"/);
});
