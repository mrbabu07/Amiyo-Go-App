import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { spawnSync } from "node:child_process";

const envFile = "apps/api/.env";
if (!existsSync(envFile)) throw new Error("Create apps/api/.env from apps/api/.env.example before running demo setup");
loadEnvFile(envFile);
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required in apps/api/.env");

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("npm_execpath is unavailable. Run this script through npm run demo:setup");

for (const script of ["prisma:migrate:deploy", "prisma:seed", "demo:users"]) {
  const result = spawnSync(process.execPath, [npmCli, "run", script], { env: process.env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("Demo catalog and role identities are ready.");
