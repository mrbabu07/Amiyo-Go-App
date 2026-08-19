import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../../ui/tokens";

export function MarketplacePageHero({ title, description, parentLabel }: { title: string; description: string; parentLabel?: string }) {
  const router = useRouter();
  return <View style={styles.hero}><View style={styles.inner}><View style={styles.crumbs}><Pressable onPress={() => router.push("/")}><Text style={styles.crumb}>Home</Text></Pressable><Text style={styles.divider}>/</Text>{parentLabel ? <><Pressable onPress={() => router.push("/categories")}><Text style={styles.crumb}>{parentLabel}</Text></Pressable><Text style={styles.divider}>/</Text></> : null}<Text style={styles.current}>{title}</Text></View><Text accessibilityRole="header" style={styles.title}>{title}</Text><Text style={styles.description}>{description}</Text></View></View>;
}

const styles = StyleSheet.create({ hero: { backgroundColor: colors.navy, paddingHorizontal: spacing.md, paddingVertical: 42 }, inner: { alignSelf: "center", maxWidth: 1208, width: "100%" }, crumbs: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }, crumb: { color: "#cbd5e1", fontSize: 12, fontWeight: "700" }, divider: { color: "#64748b", fontSize: 12 }, current: { color: colors.surface, fontSize: 12, fontWeight: "600" }, title: { color: colors.surface, fontSize: 42, fontWeight: "700", letterSpacing: -1.2 }, description: { color: "#cbd5e1", fontSize: 16, lineHeight: 24, marginTop: 7 } });
