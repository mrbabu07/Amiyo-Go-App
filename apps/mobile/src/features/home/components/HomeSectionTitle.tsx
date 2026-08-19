import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "../../../ui/tokens";

export function HomeSectionTitle({ eyebrow, title, href, action = "View all" }: { eyebrow?: string; title: string; href?: string; action?: string }) {
  const router = useRouter();
  return <View style={styles.row}><View>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}<Text accessibilityRole="header" style={styles.title}>{title}</Text></View>{href ? <Pressable accessibilityLabel={`${action}: ${title}`} accessibilityRole="button" onPress={() => router.push(href as never)} style={styles.actionButton}><Text style={styles.action}>{action}</Text><Text style={styles.arrow}>›</Text></Pressable> : null}</View>;
}

const styles = StyleSheet.create({
  row: { alignItems: "flex-end", flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "space-between", marginBottom: 16 },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  title: { color: colors.text, flexShrink: 1, fontSize: 22, fontWeight: "700", letterSpacing: -0.5, marginTop: 3 },
  actionButton: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: 4, minHeight: 40, paddingHorizontal: 13 },
  action: { color: colors.text, fontSize: 12, fontWeight: "700" },
  arrow: { color: colors.accent, fontSize: 20, fontWeight: "700" }
});
