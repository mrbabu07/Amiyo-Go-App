import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { runMigration, type MigrationInput } from "../../packages/migration/src/index.js";

function argument(name: string, position: number) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : process.argv[position]; }
async function main() {
  const inputPath = resolve(argument("--input", 2) || "migration/fixtures/synthetic-rehearsal"); const outputPath = resolve(argument("--output", 3) || "migration/output/dry-run");
  const collections = ["users", "categories", "vendors", "products", "orders", "payments"]; const input: MigrationInput = {}; const sourceManifest: Record<string, { records: number; sha256: string }> = {};
  for (const collection of collections) { try { const raw = await readFile(resolve(inputPath, `${collection}.json`), "utf8"); const parsed = JSON.parse(raw); if (!Array.isArray(parsed)) throw new Error("must be a JSON array"); input[collection] = parsed; sourceManifest[collection] = { records: parsed.length, sha256: createHash("sha256").update(raw).digest("hex") }; } catch (error) { throw new Error(`Cannot read ${collection}.json: ${error instanceof Error ? error.message : "invalid input"}`); } }
  const result = runMigration(input); await mkdir(outputPath, { recursive: true });
  await writeFile(resolve(outputPath, "source-manifest.json"), JSON.stringify(sourceManifest, null, 2)); await writeFile(resolve(outputPath, "load-plan.json"), JSON.stringify({ digest: result.reconciliation.digest, rejected: result.reconciliation.rejected, rows: result.rows }, null, 2)); await writeFile(resolve(outputPath, "id-map.json"), JSON.stringify(result.idMap, null, 2)); await writeFile(resolve(outputPath, "rejected-rows.ndjson"), `${result.rejectedRows.map((row) => JSON.stringify(row)).join("\n")}${result.rejectedRows.length ? "\n" : ""}`); await writeFile(resolve(outputPath, "reconciliation.json"), JSON.stringify(result.reconciliation, null, 2));
  process.stdout.write(`${JSON.stringify({ outputPath, ...result.reconciliation })}\n`); if (result.rejectedRows.length) process.exitCode = 2;
}
main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : error}\n`); process.exitCode = 1; });
