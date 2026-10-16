import { writeFile } from "node:fs/promises";
import { runLoadSmoke, loadSmokeConfiguration } from "./load-smoke-lib.mjs";

const configuration = loadSmokeConfiguration(process.env);
const result = await runLoadSmoke(configuration);
const output = JSON.stringify(result, null, 2);

console.log(output);
if (configuration.reportPath) await writeFile(configuration.reportPath, `${output}\n`, { encoding: "utf8", flag: "wx" });
if (!result.passed) process.exitCode = 1;
