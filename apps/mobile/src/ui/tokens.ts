import { DynamicColorIOS, Platform, PlatformColor } from "react-native";

export const lightPalette = { background: "#f7f8fa", surface: "#ffffff", primary: "#1e7098", primaryDark: "#15506e", primarySoft: "#eaf4f8", accent: "#f57224", accentSoft: "#fff1e8", navy: "#1a1a2e", text: "#1a1a2e", muted: "#64748b", border: "#dde3ea", danger: "#dc2626", warning: "#d97706", success: "#059669" } as const;
export const darkPalette = { background: "#0f172a", surface: "#111827", primary: "#38bdf8", primaryDark: "#7dd3fc", primarySoft: "#172b3a", accent: "#fb923c", accentSoft: "#3a2418", navy: "#090f1d", text: "#f8fafc", muted: "#94a3b8", border: "#334155", danger: "#f87171", warning: "#fbbf24", success: "#34d399" } as const;

type PaletteKey = keyof typeof lightPalette;
const androidSystemNames: Partial<Record<PaletteKey, string>> = { background: "?android:attr/colorBackground", surface: "?android:attr/colorBackgroundFloating", text: "?android:attr/textColorPrimary", muted: "?android:attr/textColorSecondary", border: "?android:attr/textColorTertiary" };

const adaptive = (key: PaletteKey): string => {
  if (Platform.OS === "web") return `var(--amiyo-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}, ${lightPalette[key]})`;
  if (Platform.OS === "ios") return DynamicColorIOS({ light: lightPalette[key], dark: darkPalette[key] }) as unknown as string;
  if (Platform.OS === "android" && androidSystemNames[key]) return PlatformColor(androidSystemNames[key]) as unknown as string;
  return lightPalette[key];
};

export const colors = Object.fromEntries((Object.keys(lightPalette) as PaletteKey[]).map((key) => [key, adaptive(key)])) as Record<PaletteKey, string>;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 6, md: 8, lg: 12, xl: 16, pill: 999 };
