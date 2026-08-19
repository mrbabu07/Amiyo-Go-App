import { DynamicColorIOS, Platform } from "react-native";

export const lightPalette = { background: "#FAF2EA", surface: "#FFFDF9", primary: "#C25B3E", primaryDark: "#2C1A14", primarySoft: "#F5DFD2", accent: "#0F766E", accentSoft: "#DDEDEA", navy: "#2C1A14", text: "#2C1A14", muted: "#6E5A51", border: "#E7D5C8", danger: "#B42318", warning: "#B7791F", success: "#0F766E" } as const;
export const darkPalette = { background: "#160D0A", surface: "#2C1A14", primary: "#E0795B", primaryDark: "#FAF2EA", primarySoft: "#3A2119", accent: "#4DB6AB", accentSoft: "#173C39", navy: "#0F0806", text: "#FAF2EA", muted: "#D8C2B4", border: "#5A3B30", danger: "#FF8A80", warning: "#E0B98F", success: "#4DB6AB" } as const;

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
