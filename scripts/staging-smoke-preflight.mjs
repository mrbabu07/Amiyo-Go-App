import { pathToFileURL } from "node:url";

export function stagingSmokePreflight(environment = process.env) {
  const api = secureUrl(environment.API_PUBLIC_URL, "API_PUBLIC_URL");
  const loadTarget = secureUrl(environment.LOAD_TARGET_URL, "LOAD_TARGET_URL");
  if (loadTarget.origin !== api.origin) throw new Error("LOAD_TARGET_URL must use the API_PUBLIC_URL origin");
  if (loadTarget.pathname === "/") throw new Error("LOAD_TARGET_URL must identify a representative public endpoint");
  return { apiOrigin: api.origin, loadPath: `${loadTarget.pathname}${loadTarget.search}` };
}

function secureUrl(value, name) {
  if (!value?.trim()) throw new Error(`${name} is required`);
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error(`${name} must be a valid absolute URL`); }
  if (parsed.protocol !== "https:") throw new Error(`${name} must use HTTPS`);
  if (parsed.username || parsed.password) throw new Error(`${name} must not contain credentials`);
  if (parsed.hash) throw new Error(`${name} must not contain a fragment`);
  return parsed;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = stagingSmokePreflight();
  process.stdout.write(`Staging smoke configuration accepted for ${result.apiOrigin}${result.loadPath}\n`);
}
