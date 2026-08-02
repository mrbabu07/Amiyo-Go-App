import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from "@firebase/auth";
import { firebaseApp, firebaseConfigured } from "./firebase.config";
import { connectConfiguredAuthEmulator } from "./firebase-auth-emulator";

function createAuth(): Auth | null {
  if (!firebaseApp) return null;
  try {
    return connectConfiguredAuthEmulator(initializeAuth(firebaseApp, { persistence: getReactNativePersistence(AsyncStorage) }));
  } catch {
    return connectConfiguredAuthEmulator(getAuth(firebaseApp));
  }
}

export { firebaseConfigured };
export const firebaseAuth = createAuth();
