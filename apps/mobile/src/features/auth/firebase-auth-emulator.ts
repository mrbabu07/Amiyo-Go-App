import { connectAuthEmulator, type Auth } from "firebase/auth";

const emulatorUrl = process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL;

export function connectConfiguredAuthEmulator(auth: Auth) {
  if (!emulatorUrl) return auth;
  try {
    connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
  } catch {
    if (!auth.emulatorConfig) throw new Error("Firebase Auth emulator configuration failed");
  }
  return auth;
}
