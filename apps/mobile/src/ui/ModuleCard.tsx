import type { PropsWithChildren } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "./tokens";

type ModuleCardProps = PropsWithChildren<{ title: string; meta?: string }>;

export function ModuleCard({ title, meta, children }: ModuleCardProps) {
  return <View style={styles.card}><View style={styles.accent} /><View style={styles.heading}><Text style={styles.title}>{title}</Text>{meta ? <Text style={styles.meta}>{meta}</Text> : null}</View><View style={styles.body}>{children}</View></View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, minWidth: 0, overflow: "hidden", ...Platform.select({ web: { boxShadow: "0 10px 30px rgba(11,31,58,0.08)" }, default: { elevation: 3, shadowColor: colors.navy, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.09, shadowRadius: 14 } }) }, accent: { backgroundColor: colors.primary, height: 3 }, heading: { gap: 4, minWidth: 0, paddingBottom: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.lg }, title: { color: colors.text, flexShrink: 1, fontSize: 17, fontWeight: "700" }, meta: { color: colors.muted, flexShrink: 1, fontSize: 12, lineHeight: 18 }, body: { gap: spacing.sm, minWidth: 0, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.sm }
});
