const sessionKey = "amiyo.firebase.session-user";
const sessionDurationMs = 60 * 24 * 60 * 60_000;
type SessionMarker = { userId: string; issuedAt: number; expiresAt: number };

export async function ensureSessionMarker(userId: string, now = Date.now()) {
  const stored = globalThis.localStorage?.getItem(sessionKey);
  if (stored) {
    try {
      const marker = JSON.parse(stored) as SessionMarker;
      if (marker.userId === userId && marker.expiresAt > now) return true;
      if (marker.userId === userId && marker.expiresAt <= now) { await clearSessionMarker(); return false; }
    } catch {}
  }
  globalThis.localStorage?.setItem(sessionKey, JSON.stringify({ userId, issuedAt: now, expiresAt: now + sessionDurationMs } satisfies SessionMarker));
  return true;
}

export async function clearSessionMarker() { globalThis.localStorage?.removeItem(sessionKey); }
