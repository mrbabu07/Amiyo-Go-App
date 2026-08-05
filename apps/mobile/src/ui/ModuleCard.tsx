import type { PropsWithChildren } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "./tokens";

type ModuleCardProps = PropsWithChildren<{ title: string; meta?: string }>;

export function ModuleCard({ title, meta, children }: ModuleCardProps) {
  return <View style={styles.card}><View style={styles.accent} /><View style={styles.heading}><Text style={styles.title}>{title}</Text>{meta ? <Text style={styles.meta}>{meta}</Text> : null}</View><View style={styles.body}>{children}</View></View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, overflow: "hidden", ...Platform.select({ web: { boxShadow: "0 4px 16px rgba(15,23,42,0.06)" }, default: { elevation: 2, shadowColor: "#0f172a", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8 } }) }, accent: { backgroundColor: colors.primary, height: 3 }, heading: { borderBottomColor: "#f1f5f9", borderBottomWidth: 1, gap: 4, paddingHorizontal: spacing.md, paddingVertical: 14 }, title: { color: colors.text, fontSize: 17, fontWeight: "900" }, meta: { color: colors.muted, fontSize: 12, lineHeight: 18 }, body: { gap: spacing.sm, padding: spacing.md }
});
