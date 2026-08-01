import * as SecureStore from "expo-secure-store";

const sessionKey = "amiyo.firebase.session-user";

export function storeSessionMarker(userId: string) {
  return SecureStore.setItemAsync(sessionKey, userId, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
}

export function clearSessionMarker() {
  return SecureStore.deleteItemAsync(sessionKey);
}
