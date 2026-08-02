import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../../ui/tokens";

export function HomeSectionTitle({ eyebrow, title, href, action = "View all" }: { eyebrow?: string; title: string; href?: string; action?: string }) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      <View>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}<Text accessibilityRole="header" style={styles.title}>{title}</Text></View>
      {href ? <Pressable accessibilityLabel={`${action}: ${title}`} accessibilityRole="button" onPress={() => router.push(href as never)}><Text style={styles.action}>{action}  ›</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  title: { color: colors.text, fontSize: 22, fontWeight: "900", letterSpacing: -0.5, marginTop: 2 },
  action: { color: colors.primary, fontSize: 12, fontWeight: "900", paddingBottom: 3 }
});
