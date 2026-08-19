import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../../ui/Screen";
import { colors, radius, spacing } from "../../../ui/tokens";

export function EngagementState({ action, copy, eyebrow, icon, loading, onPress, title }: { action?: string; copy: string; eyebrow: string; icon: string; loading?: boolean; onPress?: () => void; title: string }) {
  return <Screen eyebrow={eyebrow} title={title} description={copy}><View style={styles.panel}>{loading ? <ActivityIndicator color={colors.primary} size="large" /> : <Ionicons color={colors.primary} name={icon as never} size={52} />}{action && onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}><Text style={styles.buttonText}>{action}</Text></Pressable> : null}</View></Screen>;
}

const styles = StyleSheet.create({ panel: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderStyle: "dashed", borderWidth: 1, gap: spacing.lg, padding: 44 }, button: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 13 }, buttonText: { color: colors.surface, fontWeight: "700" } });
