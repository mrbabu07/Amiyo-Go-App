import * as Application from "expo-application";
import * as Device from "expo-device";
import { onIdTokenChanged, type User } from "firebase/auth";
import { useEffect } from "react";
import { Platform } from "react-native";
import { firebaseAuth } from "../auth/firebase";

const apiUrl = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
async function installationId() { if (Platform.OS === "android") return Application.getAndroidId(); if (Platform.OS === "ios") return await Application.getIosIdForVendorAsync(); return null; }
async function register(user: User) { const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID; if (!projectId || !Device.isDevice || Platform.OS === "web") return; const Notifications = await import("expo-notifications"); if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("default", { name: "Marketplace updates", importance: Notifications.AndroidImportance.DEFAULT }); const permission = await Notifications.getPermissionsAsync(); const finalPermission = permission.granted ? permission : await Notifications.requestPermissionsAsync(); if (!finalPermission.granted) return; const id = await installationId(); if (!id) return; const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data; const token = await user.getIdToken(); const response = await fetch(`${apiUrl}/api/v2/devices`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ installationId: id, platform: Platform.OS, appVersion: Application.nativeApplicationVersion, pushToken, pushProvider: "expo" }) }); if (!response.ok) throw new Error(`Push registration failed (${response.status})`); }
export function PushRegistration() { useEffect(() => { if (Platform.OS === "web" || !firebaseAuth) return; return onIdTokenChanged(firebaseAuth, (user) => { if (user) void register(user).catch(() => undefined); }); }, []); return null; }
