import type { ReturnDto } from "@amiyo/contracts";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { returnProgress } from "../orders/return-progress";

export function ReturnStatusTracker({ item, compact }: { item: ReturnDto; compact: boolean }) {
  return <View style={styles.section}>
    <View style={styles.steps}>{returnProgress(item.events).map((step) => <View key={step.status} style={[styles.step, compact && styles.compact]}>
      <Ionicons name={step.recordedAt ? "checkmark-circle" : "ellipse-outline"} color={step.recordedAt ? colors.success : colors.muted} size={22} />
      <View style={styles.copy}><Text style={styles.title}>{step.title}</Text><Text style={styles.caption}>{step.recordedAt ? `Recorded ${new Date(step.recordedAt).toLocaleString("en-BD")}` : "Not recorded"}</Text></View>
    </View>)}</View>
    {!item.events?.length ? <Text style={styles.caption}>Event history is unavailable. Current status: {item.status.replaceAll("_", " ")}.</Text> : <Text style={styles.caption}>Only recorded milestones are checked. Open tracking for review decisions and the full event history.</Text>}
    {item.status === "REJECTED" ? <Text accessibilityRole="alert" style={styles.warning}>This request was rejected. Contact support if you need a review.</Text> : null}
    {item.status === "CLOSED" ? <Text style={styles.caption}>This request is closed. Closure alone does not confirm a refund.</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  steps: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  step: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, flexGrow: 1, flexBasis: 150, minWidth: 0 },
  compact: { flexBasis: "100%", width: "100%" },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  title: { color: colors.text, fontWeight: "600", fontSize: 13 },
  caption: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  warning: { color: colors.danger, fontSize: 13, lineHeight: 20 }
});
