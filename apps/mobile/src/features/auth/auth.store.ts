import type { Session } from "@amiyo/contracts";
import { create } from "zustand";

type AuthStatus = "loading" | "guest" | "authenticated" | "error";

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  error: string | null;
  setLoading(): void;
  setGuest(): void;
  setSession(session: Session): void;
  setError(message: string): void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  session: null,
  error: null,
  setLoading: () => set({ status: "loading", error: null }),
  setGuest: () => set({ status: "guest", session: null, error: null }),
  setSession: (session) => set({ status: "authenticated", session, error: null }),
  setError: (error) => set({ status: "error", session: null, error })
}));
