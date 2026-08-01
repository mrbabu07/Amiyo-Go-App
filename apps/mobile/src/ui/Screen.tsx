import type { PropsWithChildren } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "./tokens";

type ScreenProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  description?: string;
}>;

export function Screen({ eyebrow, title, description, children }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  eyebrow: { color: colors.primary, fontWeight: "800", letterSpacing: 1 },
  title: { color: colors.text, fontSize: 30, fontWeight: "900", lineHeight: 36 },
  description: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  content: { gap: spacing.md }
});
