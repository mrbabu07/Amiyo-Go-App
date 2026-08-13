import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, useColorScheme } from "react-native";
import { colors, radius } from "./tokens";
import { useThemeStore } from "./theme.store";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const mode = useThemeStore((state) => state.mode);
  const toggle = useThemeStore((state) => state.toggleTheme);
  const system = useColorScheme();
  const dark = mode === "dark" || (mode === "system" && system === "dark");
  return <Pressable accessibilityLabel={dark ? "Use light theme" : "Use dark theme"} accessibilityRole="button" onPress={toggle} style={[styles.button, compact && styles.compact]}><Ionicons color={colors.text} name={dark ? "sunny-outline" : "moon-outline"} size={compact ? 19 : 21} /></Pressable>;
}

const styles = StyleSheet.create({ button: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, height: 40, justifyContent: "center", width: 40 }, compact: { borderRadius: radius.md, height: 38, width: 38 } });
