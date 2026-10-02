import { onIdTokenChanged } from "firebase/auth";
import { useSyncExternalStore } from "react";
import { firebaseAuth } from "./firebase";

const subscribe = (notify: () => void) => firebaseAuth ? onIdTokenChanged(firebaseAuth, notify) : () => {};
const snapshot = () => firebaseAuth?.currentUser ?? null;
const serverSnapshot = () => null;

export function useCurrentUser() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
