import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";
type ThemeState = { mode: ThemeMode; setMode(mode: ThemeMode): void; toggleTheme(): void };

export const useThemeStore = create<ThemeState>()(persist((set) => ({
  mode: "system",
  setMode: (mode) => set({ mode }),
  toggleTheme: () => set((state) => ({ mode: state.mode === "dark" || (state.mode === "system" && Appearance.getColorScheme() === "dark") ? "light" : "dark" }))
}), { name: "amiyo-theme", storage: createJSONStorage(() => AsyncStorage) }));
