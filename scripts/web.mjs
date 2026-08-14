import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const url = "http://localhost:8081";

async function expoRunning() {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1_500) });
    return response.ok;
  } catch {
    return false;
  }
}

if (await expoRunning()) {
  console.log(`Amiyo web is already running: ${url}`);
  process.exit(0);
}

const expoCli = fileURLToPath(new URL("../node_modules/expo/bin/cli", import.meta.url));
const mobileDirectory = fileURLToPath(new URL("../apps/mobile/", import.meta.url));
const child = spawn(process.execPath, [expoCli, "start", "--web", "--clear", "--port", "8081"], { cwd: mobileDirectory, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
