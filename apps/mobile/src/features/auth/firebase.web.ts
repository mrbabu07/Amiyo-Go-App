import { getAuth } from "firebase/auth";
import { firebaseApp, firebaseConfigured } from "./firebase.config";
import { connectConfiguredAuthEmulator } from "./firebase-auth-emulator";

export { firebaseConfigured };
export const firebaseAuth = firebaseApp ? connectConfiguredAuthEmulator(getAuth(firebaseApp)) : null;
