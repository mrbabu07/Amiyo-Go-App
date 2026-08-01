import { getAuth } from "firebase/auth";
import { firebaseApp, firebaseConfigured } from "./firebase.config";

export { firebaseConfigured };
export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;
