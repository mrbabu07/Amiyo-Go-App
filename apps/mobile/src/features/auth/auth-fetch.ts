import { signOut, type Auth } from "firebase/auth";

let installed = false;

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (typeof URL !== "undefined" && input instanceof URL) return input.href;
  return (input as Request).url;
}

function requestHeaders(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined);
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
  return headers;
}

async function invalidAccessToken(response: Response) {
  if (response.status !== 401) return false;
  const problem = await response.clone().json().catch(() => null) as { code?: string } | null;
  return problem?.code === "INVALID_ACCESS_TOKEN";
}

export function installAuthenticatedFetchRetry(auth: Auth, apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000") {
  if (installed || typeof globalThis.fetch !== "function") return;
  installed = true;
  const apiOrigin = new URL(apiUrl).origin;
  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (input, init) => {
    const retryInput = typeof Request !== "undefined" && input instanceof Request ? input.clone() : input;
    const response = await originalFetch(input, init);
    const headers = requestHeaders(retryInput, init);
    if (new URL(requestUrl(retryInput), apiOrigin).origin !== apiOrigin || !headers.has("authorization") || !(await invalidAccessToken(response))) return response;

    const user = auth.currentUser;
    if (!user) return response;
    try {
      headers.set("authorization", `Bearer ${await user.getIdToken(true)}`);
      const retried = await originalFetch(retryInput, { ...init, headers });
      if (await invalidAccessToken(retried)) await signOut(auth);
      return retried;
    } catch {
      await signOut(auth);
      return response;
    }
  };
}
