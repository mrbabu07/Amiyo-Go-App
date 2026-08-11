import { signInAnonymously, type User } from "firebase/auth";
import { createSession } from "./auth.api";
import { firebaseAuth } from "./firebase";
import { useAuthStore } from "./auth.store";

let pendingGuest: Promise<User> | null = null;

export function ensureGuestUser(): Promise<User> {
  if (firebaseAuth?.currentUser) return Promise.resolve(firebaseAuth.currentUser);
  if (!firebaseAuth) return Promise.reject(new Error("Firebase authentication is not configured"));
  if (pendingGuest) return pendingGuest;
  pendingGuest = signInAnonymously(firebaseAuth).then(async ({ user }) => {
    useAuthStore.getState().setSession(await createSession(user));
    return user;
  }).finally(() => { pendingGuest = null; });
  return pendingGuest;
}
