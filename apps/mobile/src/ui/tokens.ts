import { DynamicColorIOS, Platform } from "react-native";

export const lightPalette = { background: "#FBF4EC", surface: "#FFFDF9", primary: "#C1614A", primaryDark: "#3A2318", primarySoft: "#F7E8D9", accent: "#E0B98F", accentSoft: "#F2D8B7", navy: "#3A2318", text: "#3A2318", muted: "#7B6256", border: "#E8D7C5", danger: "#B42318", warning: "#B7791F", success: "#2F7D4E" } as const;
export const darkPalette = { background: "#1B100B", surface: "#2A1811", primary: "#E07B63", primaryDark: "#FBF4EC", primarySoft: "#3A2318", accent: "#E0B98F", accentSoft: "#5B3A2D", navy: "#24130D", text: "#FBF4EC", muted: "#D8C4B3", border: "#5B3A2D", danger: "#FF8A80", warning: "#E0B98F", success: "#6FCF97" } as const;

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
