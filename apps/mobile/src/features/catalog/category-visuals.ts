const categoryRules = [
  { terms: ["fashion", "clothing", "shoe", "wear"], icon: "shirt-outline", background: "#fce7f3", foreground: "#be185d" },
  { terms: ["electronics", "mobile", "phone", "gadget", "computer"], icon: "phone-portrait-outline", background: "#dbeafe", foreground: "#1d4ed8" },
  { terms: ["beauty", "cosmetic", "grooming"], icon: "sparkles-outline", background: "#fce7f3", foreground: "#c026d3" },
  { terms: ["home", "living", "furniture", "kitchen"], icon: "home-outline", background: "#ffedd5", foreground: "#c2410c" },
  { terms: ["grocery", "food", "vegetable", "fruit"], icon: "basket-outline", background: "#ecfccb", foreground: "#4d7c0f" },
  { terms: ["sport", "fitness", "outdoor"], icon: "football-outline", background: "#dcfce7", foreground: "#15803d" },
  { terms: ["baby", "kids", "toy"], icon: "happy-outline", background: "#cffafe", foreground: "#0e7490" },
  { terms: ["book", "stationery", "office"], icon: "book-outline", background: "#e0e7ff", foreground: "#4338ca" },
  { terms: ["health", "pharmacy", "medicine"], icon: "medkit-outline", background: "#fee2e2", foreground: "#b91c1c" },
  { terms: ["car", "vehicle", "bike", "auto"], icon: "car-sport-outline", background: "#e2e8f0", foreground: "#334155" }
] as const;
const fallbacks = [
  { background: "#e0f2fe", foreground: "#0369a1" },
  { background: "#f3e8ff", foreground: "#7e22ce" },
  { background: "#fef3c7", foreground: "#a16207" },
  { background: "#ccfbf1", foreground: "#0f766e" }
] as const;

export function getCategoryVisual(category: { name: string; slug: string }, index = 0) {
  const searchable = `${category.slug} ${category.name}`.toLowerCase();
  const match = categoryRules.find((rule) => rule.terms.some((term) => searchable.includes(term)));
  const fallback = fallbacks[index % fallbacks.length]!;
  return match ? { icon: match.icon, background: match.background, foreground: match.foreground } : { icon: "grid-outline", ...fallback };
}
