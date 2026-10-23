import { writeFile } from "node:fs/promises";

const required = (name, pattern, maximum = 500) => {
  const value = process.env[name]?.trim();
  if (!value || value.length > maximum || /[\r\n]/.test(value) || !pattern.test(value)) throw new Error(`${name} is invalid`);
  return value;
};

const commitSha = required("RELEASE_COMMIT_SHA", /^[0-9a-f]{40}$/i);
const environment = required("RELEASE_ENVIRONMENT", /^(staging|production)$/);
const runId = required("RELEASE_RUN_ID", /^[0-9]+$/);
const imagePattern = /^ghcr\.io\/[a-z0-9._/-]+:[0-9a-f]{40}$/i;
const digestPattern = /^sha256:[0-9a-f]{64}$/i;
const outputPath = required("RELEASE_MANIFEST_PATH", /^.+$/, 2_048);

const manifest = {
  schemaVersion: 1,
  createdAt: new Date().toISOString(),
  provenance: { commitSha, environment, runId },
  images: {
    api: {
      reference: required("API_IMAGE_REFERENCE", imagePattern),
      digest: required("API_IMAGE_DIGEST", digestPattern)
    },
    worker: {
      reference: required("WORKER_IMAGE_REFERENCE", imagePattern),
      digest: required("WORKER_IMAGE_DIGEST", digestPattern)
    }
  }
};

await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
console.log(`Release manifest written for ${environment} commit ${commitSha}.`);
