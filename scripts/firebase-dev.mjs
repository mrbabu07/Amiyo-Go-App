import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const firebaseCli = fileURLToPath(new URL("../node_modules/firebase-tools/lib/bin/firebase.js", import.meta.url));
const exportDirectory = ".firebase-data";
const args = [firebaseCli, "emulators:start", "--only", "auth", "--project", "amiyo-app", "--export-on-exit", exportDirectory];
if (existsSync(`${exportDirectory}/firebase-export-metadata.json`)) args.push("--import", exportDirectory);

const child = spawn(process.execPath, args, { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
