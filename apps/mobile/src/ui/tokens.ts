import { DynamicColorIOS, Platform } from "react-native";

export const lightPalette = { background: "#FAF7F0", surface: "#FFFDF8", primary: "#7A1F2B", primaryDark: "#0B1F3A", primarySoft: "#F3E4E7", accent: "#6B7A3A", accentSoft: "#EEF1E4", navy: "#0B1F3A", text: "#0B1F3A", muted: "#62675B", border: "#E6D9C8", danger: "#B42318", warning: "#A76F16", success: "#4F6F32" } as const;
export const darkPalette = { background: "#050B14", surface: "#0B1F3A", primary: "#B44B5A", primaryDark: "#FAF7F0", primarySoft: "#351924", accent: "#9AAA5B", accentSoft: "#273319", navy: "#07111F", text: "#FAF7F0", muted: "#C9C2B6", border: "#263B55", danger: "#FF8A80", warning: "#D6A44E", success: "#9AAA5B" } as const;

type PaletteKey = keyof typeof lightPalette;

const adaptive = (key: PaletteKey): string => {
  if (Platform.OS === "web") return `var(--amiyo-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}, ${lightPalette[key]})`;
  if (Platform.OS === "ios") return DynamicColorIOS({ light: lightPalette[key], dark: darkPalette[key] }) as unknown as string;
  return lightPalette[key];
};

export const colors = Object.fromEntries((Object.keys(lightPalette) as PaletteKey[]).map((key) => [key, adaptive(key)])) as Record<PaletteKey, string>;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 6, md: 8, lg: 12, xl: 16, pill: 999 };
export const typography = {
  fontFamily: Platform.select({
    web: '"Quicksand", "Noto Serif", "Lora", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    default: "System"
  }) as string,
  serifFamily: Platform.select({ web: '"Lora", "Noto Serif", Georgia, serif', default: "serif" }) as string,
  brandFamily: Platform.select({ web: '"Croissant One", "Lora", serif', default: "serif" }) as string,
  weights: { regular: "400", medium: "500", semibold: "600", bold: "700" } as const
};
