import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "./tokens";

type ModuleCardProps = PropsWithChildren<{
  title: string;
  meta?: string;
}>;

export function ModuleCard({ title, meta, children }: ModuleCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 14, lineHeight: 20 }
});
