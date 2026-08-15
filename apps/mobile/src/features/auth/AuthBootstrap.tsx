import { onIdTokenChanged, signOut } from "firebase/auth";
import { useEffect } from "react";
import { createSession } from "./auth.api";
import { firebaseAuth, firebaseConfigured } from "./firebase";
import { useAuthStore } from "./auth.store";
import { installAuthenticatedFetchRetry } from "./auth-fetch";
import { clearSessionMarker, ensureSessionMarker } from "./session-marker";

export function AuthBootstrap() {
  const { setError, setGuest, setLoading, setSession } = useAuthStore();

  useEffect(() => {
    const auth = firebaseAuth;
    if (!firebaseConfigured || !auth) {
      setGuest();
      return;
    }
    installAuthenticatedFetchRetry(auth);
    setLoading();
    return onIdTokenChanged(auth, async (user) => {
      if (!user) {
        await clearSessionMarker();
        setGuest();
        return;
      }
      try {
        if (!(await ensureSessionMarker(user.uid))) {
          await signOut(auth);
          setGuest();
          return;
        }
        setSession(await createSession(user));
      } catch (error) {
        setError(error instanceof Error ? error.message : "Could not restore your session");
      }
    });
  }, [setError, setGuest, setLoading, setSession]);

  return null;
}
