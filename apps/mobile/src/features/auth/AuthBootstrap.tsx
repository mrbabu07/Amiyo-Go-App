import { onIdTokenChanged, signOut } from "@firebase/auth";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createSession } from "./auth.api";
import { firebaseAuth, firebaseConfigured } from "./firebase";
import { useAuthStore } from "./auth.store";
import { installAuthenticatedFetchRetry } from "./auth-fetch";
import { clearSessionMarker, ensureSessionMarker } from "./session-marker";

export function AuthBootstrap() {
  const queryClient = useQueryClient();
  const { setError, setGuest, setLoading, setSession } = useAuthStore();

  useEffect(() => {
    const auth = firebaseAuth;
    if (!firebaseConfigured || !auth) {
      setGuest();
      return;
    }
    installAuthenticatedFetchRetry(auth);
    setLoading();
    let revision = 0;
    let previousUid: string | null | undefined;
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      const currentRevision = ++revision;
      const current = () => currentRevision === revision && auth.currentUser?.uid === user?.uid;
      if (previousUid !== (user?.uid ?? null)) {
        previousUid = user?.uid ?? null;
        setGuest();
        queryClient.clear();
        if (user) setLoading();
      }
      if (!user) {
        await clearSessionMarker();
        if (current()) setGuest();
        return;
      }
      try {
        const remembered = await ensureSessionMarker(user.uid);
        if (!current()) return;
        if (!remembered) {
          await signOut(auth);
          setGuest();
          return;
        }
        const session = await createSession(user);
        if (current()) setSession(session);
      } catch (error) {
        if (current()) setError(error instanceof Error ? error.message : "Could not restore your session");
      }
    });
    return () => { revision++; unsubscribe(); };
  }, [queryClient, setError, setGuest, setLoading, setSession]);

  return null;
}
