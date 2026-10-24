import { readFile, writeFile } from "node:fs/promises";
import { parseMobileDeviceEvidence, validateMobileDeviceEvidence } from "./mobile-device-evidence-lib.mjs";

const evidencePath = process.env.MOBILE_DEVICE_EVIDENCE_PATH?.trim();
if (!evidencePath || evidencePath.length > 2_048 || /[\r\n]/.test(evidencePath)) throw new Error("MOBILE_DEVICE_EVIDENCE_PATH is required");
const report = parseMobileDeviceEvidence(await readFile(evidencePath, "utf8"));
const validated = validateMobileDeviceEvidence(report, { expectedCommitSha: process.env.RELEASE_COMMIT_SHA });
const outputPath = process.env.MOBILE_DEVICE_EVIDENCE_REPORT_PATH?.trim();
if (outputPath) await writeFile(outputPath, `${JSON.stringify(validated, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
console.log(`Validated ${validated.app.platform} device evidence for commit ${validated.commitSha}.`);
