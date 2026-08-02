import { createHash } from "node:crypto";
import { mapDocument, migrationOrder } from "./mappers.js";
import type { MigrationInput, MigrationResult, Reconciliation, RejectedRow, TargetRow } from "./types.js";

function stable(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`; if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`; return JSON.stringify(value); }

export function runMigration(input: MigrationInput): MigrationResult {
  const rows: TargetRow[] = []; const rejectedRows: RejectedRow[] = [];
  for (const collection of migrationOrder) for (const document of input[collection] || []) { try { rows.push(...mapDocument(collection, document)); } catch (error) { rejectedRows.push({ sourceCollection: collection, legacyId: typeof document._id === "string" ? document._id : null, code: "MAPPING_REJECTED", detail: error instanceof Error ? error.message : "Unknown mapping error" }); } }
  rows.sort((left, right) => left.targetTable.localeCompare(right.targetTable) || left.targetId.localeCompare(right.targetId)); const idMap = rows.map((item) => ({ sourceCollection: item.sourceCollection, legacyId: item.legacyId, targetTable: item.targetTable, targetId: item.targetId }));
  const sourceCounts = Object.fromEntries(migrationOrder.map((collection) => [collection, input[collection]?.length || 0])); const targetCounts: Record<string, number> = {}; const rejectedCounts: Record<string, number> = {}; const monetaryTotals: Record<string, string> = {};
  for (const item of rows) { targetCounts[item.targetTable] = (targetCounts[item.targetTable] || 0) + 1; for (const field of ["subtotalMinor", "totalMinor", "amountMinor", "refundedMinor", "lineTotalMinor"]) if (typeof item.data[field] === "string" && /^\d+$/.test(item.data[field] as string)) { const key = `${item.targetTable}.${field}`; monetaryTotals[key] = (BigInt(monetaryTotals[key] || "0") + BigInt(item.data[field] as string)).toString(); } }
  for (const item of rejectedRows) rejectedCounts[item.sourceCollection] = (rejectedCounts[item.sourceCollection] || 0) + 1;
  const digest = createHash("sha256").update(stable({ rows, rejectedRows })).digest("hex"); const reconciliation: Reconciliation = { sourceCounts, targetCounts, rejectedCounts, monetaryTotals, accepted: rows.length, rejected: rejectedRows.length, digest }; return { rows, idMap, rejectedRows, reconciliation };
}
