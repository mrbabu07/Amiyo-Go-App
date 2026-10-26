import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { colors, spacing } from "../../ui/tokens";

export function MarketplacePageHero({ title, description, parentLabel }: { title: string; description: string; parentLabel?: string }) {
  const router = useRouter();
  const compact = useWindowDimensions().width < 620;

  return (
    <View style={[styles.hero, compact && styles.heroCompact]}>
      <View style={styles.inner}>
        <View style={styles.crumbs}>
          <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.push("/")}>
            <Text style={styles.crumb}>Home</Text>
          </Pressable>
          <Text style={styles.divider}>/</Text>
          {parentLabel ? (
            <>
              <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.push("/categories")}>
                <Text style={styles.crumb}>{parentLabel}</Text>
              </Pressable>
              <Text style={styles.divider}>/</Text>
            </>
          ) : null}
          <Text style={styles.current}>{title}</Text>
        </View>
        <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
        <Text style={[styles.description, compact && styles.descriptionCompact]}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.navy, paddingHorizontal: spacing.md, paddingVertical: 42 },
  heroCompact: { paddingVertical: spacing.lg },
  inner: { alignSelf: "center", maxWidth: 1208, width: "100%" },
  crumbs: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  crumb: { color: colors.shellMuted, fontSize: 12, fontWeight: "700" },
  divider: { color: colors.muted, fontSize: 12 },
  current: { color: colors.surface, fontSize: 12, fontWeight: "600" },
  title: { color: colors.surface, fontSize: 42, fontWeight: "700", letterSpacing: -1.2 },
  titleCompact: { fontSize: 30, letterSpacing: -0.6, lineHeight: 37 },
  description: { color: colors.shellMuted, fontSize: 16, lineHeight: 24, marginTop: 7 },
  descriptionCompact: { fontSize: 14, lineHeight: 21 }
});
