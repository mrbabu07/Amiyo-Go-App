import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type AdminTheme = "light" | "dark";

type AdminThemeState = {
  theme: AdminTheme;
  toggleTheme(): void;
};

export const useAdminThemeStore = create<AdminThemeState>()(persist((set) => ({
  theme: "light",
  toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" }))
}), {
  name: "amiyo-admin-theme",
  storage: createJSONStorage(() => AsyncStorage)
}));
