import { DynamicColorIOS, Platform } from "react-native";

export const lightPalette = { background: "#FBFCFC", surface: "#FFFFFF", primary: "#14746F", primaryDark: "#0F3D3E", primarySoft: "#E6F2EE", accent: "#8EB69B", accentSoft: "#E8F1EA", navy: "#0F3D3E", text: "#0F3D3E", muted: "#52706B", border: "#D8E8E1", danger: "#B42318", warning: "#B7791F", success: "#14746F" } as const;
export const darkPalette = { background: "#071F20", surface: "#0F3D3E", primary: "#5FB3AB", primaryDark: "#FBFCFC", primarySoft: "#123536", accent: "#8EB69B", accentSoft: "#1D5552", navy: "#061A1B", text: "#FBFCFC", muted: "#B9D0C3", border: "#235C59", danger: "#FF8A80", warning: "#E0B98F", success: "#8EB69B" } as const;

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
