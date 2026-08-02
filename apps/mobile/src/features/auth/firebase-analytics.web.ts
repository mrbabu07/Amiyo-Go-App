import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { firebaseAnalyticsEnabled, firebaseApp } from "./firebase.config";

let analytics: Promise<Analytics | null> | null = null;

export function getFirebaseAnalytics() {
  if (!firebaseApp || !firebaseAnalyticsEnabled) return Promise.resolve(null);
  analytics ??= isSupported().then((supported) => supported ? getAnalytics(firebaseApp) : null).catch(() => null);
  return analytics;
}
