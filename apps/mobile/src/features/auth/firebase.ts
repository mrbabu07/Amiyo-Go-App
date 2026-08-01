import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from "@firebase/auth";
import { firebaseApp, firebaseConfigured } from "./firebase.config";

function createAuth(): Auth | null {
  if (!firebaseApp) return null;
  try {
    return initializeAuth(firebaseApp, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    return getAuth(firebaseApp);
  }
}

export { firebaseConfigured };
export const firebaseAuth = createAuth();
