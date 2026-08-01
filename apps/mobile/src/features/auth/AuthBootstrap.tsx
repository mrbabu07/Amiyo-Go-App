import { onIdTokenChanged } from "firebase/auth";
import { useEffect } from "react";
import { createSession } from "./auth.api";
import { firebaseAuth, firebaseConfigured } from "./firebase";
import { useAuthStore } from "./auth.store";
import { clearSessionMarker, storeSessionMarker } from "./session-marker";

export function AuthBootstrap() {
  const { setError, setGuest, setLoading, setSession } = useAuthStore();

  useEffect(() => {
    if (!firebaseConfigured || !firebaseAuth) {
      setGuest();
      return;
    }
    setLoading();
    return onIdTokenChanged(firebaseAuth, async (user) => {
      if (!user) {
        await clearSessionMarker();
        setGuest();
        return;
      }
      try {
        await storeSessionMarker(user.uid);
        setSession(await createSession(user));
      } catch (error) {
        setError(error instanceof Error ? error.message : "Could not restore your session");
      }
    });
  }, [setError, setGuest, setLoading, setSession]);

  return null;
}
