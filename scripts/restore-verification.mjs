import { writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { restoreVerificationConfiguration, verifyRestoredDatabase } from "./restore-verification-lib.mjs";

const configuration = restoreVerificationConfiguration(process.env);
const client = new PrismaClient({ datasources: { db: { url: configuration.databaseUrl } } });
try {
  const report = await verifyRestoredDatabase(client);
  const output = JSON.stringify(report, null, 2);
  console.log(output);
  await writeFile(configuration.reportPath, `${output}\n`, { encoding: "utf8", flag: "wx" });
  if (!report.passed) process.exitCode = 1;
} finally {
  await client.$disconnect();
}
