import { writeFile } from "node:fs/promises";

const evidence = [
  ["ANDROID_DEVICE_EVIDENCE_JSON", "android-device-evidence.json"],
  ["IOS_DEVICE_EVIDENCE_JSON", "ios-device-evidence.json"],
  ["FINANCE_PROVIDER_EVIDENCE_JSON", "finance-provider-evidence.json"]
];

await Promise.all(evidence.map(async ([name, path]) => {
  const value = process.env[name];
  if (!value || value.length > 48_000 || value.includes("\0")) throw new Error(`${name} is missing or invalid`);
  JSON.parse(value.replace(/^\uFEFF/, ""));
  await writeFile(path, value, { encoding: "utf8", flag: "wx", mode: 0o600 });
}));

console.log("Protected release evidence files materialized.");
