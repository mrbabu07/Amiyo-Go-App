import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { parseRetentionApprovalEvidence, validateRetentionApprovalEvidence } from "./retention-approval-evidence-lib.mjs";

const evidencePath = process.env.RETENTION_APPROVAL_EVIDENCE_PATH?.trim();
if (!evidencePath || evidencePath.length > 2_048 || /[\r\n\0]/.test(evidencePath)) throw new Error("RETENTION_APPROVAL_EVIDENCE_PATH is required");
const policy = await readFile(new URL("../docs/data-retention-policy.md", import.meta.url));
const expectedPolicyHash = createHash("sha256").update(policy).digest("hex");
const validated = validateRetentionApprovalEvidence(parseRetentionApprovalEvidence(await readFile(evidencePath, "utf8")), { expectedPolicyHash });
const outputPath = process.env.RETENTION_APPROVAL_EVIDENCE_REPORT_PATH?.trim();
if (outputPath) await writeFile(outputPath, `${JSON.stringify(validated, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
console.log(`Validated retention approval for policy ${validated.policyHash}.`);
