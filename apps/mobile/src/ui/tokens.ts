import { DynamicColorIOS, Platform, PlatformColor, type ColorValue } from "react-native";

export const lightPalette = { background: "#f7f8fa", surface: "#ffffff", primary: "#1e7098", primaryDark: "#15506e", primarySoft: "#eaf4f8", accent: "#f57224", accentSoft: "#fff1e8", navy: "#1a1a2e", text: "#1a1a2e", muted: "#64748b", border: "#dde3ea", danger: "#dc2626", warning: "#d97706", success: "#059669" } as const;
export const darkPalette = { background: "#0f172a", surface: "#111827", primary: "#38bdf8", primaryDark: "#7dd3fc", primarySoft: "#172b3a", accent: "#fb923c", accentSoft: "#3a2418", navy: "#090f1d", text: "#f8fafc", muted: "#94a3b8", border: "#334155", danger: "#f87171", warning: "#fbbf24", success: "#34d399" } as const;

type PaletteKey = keyof typeof lightPalette;
const androidSystem: Partial<Record<PaletteKey, ColorValue>> = { background: PlatformColor("?android:attr/colorBackground"), surface: PlatformColor("?android:attr/colorBackgroundFloating"), text: PlatformColor("?android:attr/textColorPrimary"), muted: PlatformColor("?android:attr/textColorSecondary"), border: PlatformColor("?android:attr/textColorTertiary") };
const adaptive = (key: PaletteKey): string => Platform.select({
  web: `var(--amiyo-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}, ${lightPalette[key]})`,
  ios: DynamicColorIOS({ light: lightPalette[key], dark: darkPalette[key] }),
  android: androidSystem[key] ?? lightPalette[key],
  default: lightPalette[key]
}) as unknown as string;

export const colors = Object.fromEntries((Object.keys(lightPalette) as PaletteKey[]).map((key) => [key, adaptive(key)])) as Record<PaletteKey, string>;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 6, md: 8, lg: 12, xl: 16, pill: 999 };
