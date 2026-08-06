import { existsSync, readdirSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { connect } from "node:net";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const firebaseCli = fileURLToPath(new URL("../node_modules/firebase-tools/lib/bin/firebase.js", import.meta.url));
const exportDirectory = ".firebase-data";
const emulatorAvailable = () => new Promise((resolve) => {
  const socket = connect({ host: "127.0.0.1", port: 9099 });
  socket.once("connect", () => { socket.destroy(); resolve(true); });
  socket.once("error", () => resolve(false));
});
const existingEmulator = await emulatorAvailable();

async function waitForEmulator() {
  for (let attempt = 0; attempt < 240; attempt += 1) {
    if (await emulatorAvailable()) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Firebase Auth Emulator did not become ready");
}

function firebaseEnvironment() {
  if (spawnSync("java", ["-version"], { stdio: "ignore" }).status === 0 || process.platform !== "win32") return process.env;
  const root = "C:\\Program Files\\Eclipse Adoptium";
  if (!existsSync(root)) return process.env;
  const javaHome = readdirSync(root, { withFileTypes: true }).find((entry) => entry.isDirectory())?.name;
  const javaBin = javaHome ? join(root, javaHome, "bin") : null;
  return javaBin && existsSync(join(javaBin, "java.exe")) ? { ...process.env, PATH: `${javaBin};${process.env.PATH || ""}` } : process.env;
}

function seedDemoUsers() {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("seed-firebase-demo-users.mjs", import.meta.url))], {
    env: { ...process.env, FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" },
    stdio: "inherit"
  });
  if (result.status !== 0) throw new Error("Could not seed Firebase demo users");
}

if (existingEmulator) {
  console.log("Using the Firebase Auth Emulator already running on 127.0.0.1:9099.");
  seedDemoUsers();
  process.exit(0);
}
const args = [firebaseCli, "emulators:start", "--only", "auth", "--project", "amiyo-app", "--export-on-exit", exportDirectory];
if (existsSync(`${exportDirectory}/firebase-export-metadata.json`)) args.push("--import", exportDirectory);

const child = spawn(process.execPath, args, { env: firebaseEnvironment(), stdio: "inherit" });
await waitForEmulator();
seedDemoUsers();
child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
