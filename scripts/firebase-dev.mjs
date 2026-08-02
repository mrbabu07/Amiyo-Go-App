import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { connect } from "node:net";
import { fileURLToPath } from "node:url";

const firebaseCli = fileURLToPath(new URL("../node_modules/firebase-tools/lib/bin/firebase.js", import.meta.url));
const exportDirectory = ".firebase-data";
const existingEmulator = await new Promise((resolve) => {
  const socket = connect({ host: "127.0.0.1", port: 9099 });
  socket.once("connect", () => { socket.destroy(); resolve(true); });
  socket.once("error", () => resolve(false));
});
if (existingEmulator) {
  console.log("Using the Firebase Auth Emulator already running on 127.0.0.1:9099.");
  process.exit(0);
}
const args = [firebaseCli, "emulators:start", "--only", "auth", "--project", "amiyo-app", "--export-on-exit", exportDirectory];
if (existsSync(`${exportDirectory}/firebase-export-metadata.json`)) args.push("--import", exportDirectory);

const child = spawn(process.execPath, args, { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
