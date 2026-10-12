import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { createAdminSavedViews } from "./admin-saved-views";

export const adminSavedViews = createAdminSavedViews(AsyncStorage, async (uid) => `amiyo:admin-dashboard-views:${uid}`, randomUUID);
