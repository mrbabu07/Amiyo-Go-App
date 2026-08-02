import { spawn } from "node:child_process";
import process from "node:process";

const npmCli = process.env.npm_execpath;

if (!npmCli) {
  throw new Error("npm_execpath is unavailable. Start this script with npm run dev.");
}

const processes = [
  {
    name: "firebase",
    args: ["run", "dev:firebase"]
  },
  {
    name: "api",
    args: ["--workspace", "@amiyo/api", "run", "dev"]
  },
  {
    name: "mobile",
    args: ["--workspace", "@amiyo/mobile", "run", "start"]
  }
];

const children = processes.map(({ name, args }) => {
  const child = spawn(process.execPath, [npmCli, ...args], {
    env: process.env,
    shell: false,
    stdio: ["inherit", "pipe", "pipe"]
  });

  child.stdout.on("data", (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${name}] ${chunk}`));
  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
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
