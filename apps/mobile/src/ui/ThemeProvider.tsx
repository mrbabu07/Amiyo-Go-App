import { useEffect, type PropsWithChildren } from "react";
import { Appearance, Platform, StyleSheet, useColorScheme, View } from "react-native";
import { darkPalette, lightPalette } from "./tokens";
import { useThemeStore } from "./theme.store";

export function ThemeProvider({ children }: PropsWithChildren) {
  const mode = useThemeStore((state) => state.mode);
  const system = useColorScheme();
  const resolved = mode === "system" ? system || "light" : mode;
  useEffect(() => {
    Appearance.setColorScheme(mode === "system" ? "unspecified" : mode);
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const root = document.documentElement;
    const palette = resolved === "dark" ? darkPalette : lightPalette;
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
    Object.entries(palette).forEach(([key, value]) => root.style.setProperty(`--amiyo-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, value));
    root.style.backgroundColor = palette.background;
  }, [mode, resolved]);
  return <View style={[styles.root, { backgroundColor: resolved === "dark" ? darkPalette.background : lightPalette.background }]}>{children}</View>;
}

const styles = StyleSheet.create({ root: { flex: 1 } });
