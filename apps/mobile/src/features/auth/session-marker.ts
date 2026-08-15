import * as SecureStore from "expo-secure-store";

const sessionKey = "amiyo.firebase.session-user";
const sessionDurationMs = 60 * 24 * 60 * 60_000;
type SessionMarker = { userId: string; issuedAt: number; expiresAt: number };

export async function ensureSessionMarker(userId: string, now = Date.now()) {
  const stored = await SecureStore.getItemAsync(sessionKey);
  if (stored) {
    try {
      const marker = JSON.parse(stored) as SessionMarker;
      if (marker.userId === userId && marker.expiresAt > now) return true;
      if (marker.userId === userId && marker.expiresAt <= now) { await clearSessionMarker(); return false; }
    } catch {}
  }
  const marker: SessionMarker = { userId, issuedAt: now, expiresAt: now + sessionDurationMs };
  await SecureStore.setItemAsync(sessionKey, JSON.stringify(marker), { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
  return true;
}

export function clearSessionMarker() {
  return SecureStore.deleteItemAsync(sessionKey);
}
