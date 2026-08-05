import { getApp, getApps, initializeApp } from "firebase/app";

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyBQzJ8wnwgafVqK7FxCw_qa8VdwDkwjMmw",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "amiyo-app.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "amiyo-app",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "amiyo-app.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "495903287263",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:495903287263:web:e3cc3c1961d4ed730c866a",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-8EQQ5X8LWN"
};

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
export const firebaseAnalyticsEnabled = process.env.EXPO_PUBLIC_FIREBASE_ANALYTICS_ENABLED === "true" && Boolean(firebaseConfig.measurementId);
export const firebaseApp = firebaseConfigured ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;
