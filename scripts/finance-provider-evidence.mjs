import { readFile, writeFile } from "node:fs/promises";
import { parseFinanceProviderEvidence, validateFinanceProviderEvidence } from "./finance-provider-evidence-lib.mjs";

const evidencePath = process.env.FINANCE_PROVIDER_EVIDENCE_PATH?.trim();
if (!evidencePath || evidencePath.length > 2_048 || /[\r\n]/.test(evidencePath)) throw new Error("FINANCE_PROVIDER_EVIDENCE_PATH is required");
const evidence = parseFinanceProviderEvidence(await readFile(evidencePath, "utf8"));
const validated = validateFinanceProviderEvidence(evidence, { expectedCommitSha: process.env.RELEASE_COMMIT_SHA });
const outputPath = process.env.FINANCE_PROVIDER_EVIDENCE_REPORT_PATH?.trim();
if (outputPath) await writeFile(outputPath, `${JSON.stringify(validated, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
console.log(`Validated finance provider evidence for commit ${validated.commitSha}.`);
