import { spawn } from "node:child_process";
import process from "node:process";

const npmCli = process.env.npm_execpath;

if (!npmCli) {
  throw new Error("npm_execpath is unavailable. Start this script with npm run dev.");
}

async function fetchAvailable(url, validate = () => true) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1_500) });
    if (!response.ok) return false;
    return validate(await response.text());
  } catch {
    return false;
  }
}

const [apiRunning, mobileRunning] = await Promise.all([
  fetchAvailable("http://127.0.0.1:4000/health", (body) => body.includes('"service":"amiyo-api"')),
  fetchAvailable("http://127.0.0.1:8081")
]);

if (apiRunning) console.log("[api] Reusing the Amiyo API already running on http://127.0.0.1:4000.");
if (mobileRunning) console.log("[mobile] Reusing the Expo web server already running on http://localhost:8081.");

const services = [
  {
    name: "firebase",
    args: ["run", "dev:firebase"]
  },
  {
    name: "api",
    args: ["--workspace", "@amiyo/api", "run", "dev"],
    env: { FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099" }
  },
  {
    name: "mobile",
    args: ["--workspace", "@amiyo/mobile", "run", "start"],
    env: { EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL: process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL || "http://127.0.0.1:9099" }
  }
].filter(({ name }) => name !== "api" || !apiRunning).filter(({ name }) => name !== "mobile" || !mobileRunning);

const children = services.map(({ name, args, env }) => {
  const child = spawn(process.execPath, [npmCli, ...args], {
    env: { ...process.env, ...env },
    shell: false,
    stdio: ["inherit", "pipe", "pipe"]
  });

  child.stdout.on("data", (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${name}] ${chunk}`));
  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[${name}] exited with code ${code}; stopping the remaining development services.`);
      shutdown();
      process.exit(code);
    }
  });

  return child;
});

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});
