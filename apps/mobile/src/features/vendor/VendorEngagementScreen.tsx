import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getVendorQuestions, getVendorReviews } from "../engagement/engagement.api";

export function VendorEngagementScreen() {
  const router = useRouter();
  const user = useCurrentUser();
  const reviews = useQuery({ queryKey: ["vendor", "reviews", user?.uid], queryFn: () => getVendorReviews(user!), enabled: Boolean(user) });
  const questions = useQuery({ queryKey: ["vendor", "questions", user?.uid], queryFn: () => getVendorQuestions(user!), enabled: Boolean(user) });
  const pendingReviews = reviews.data?.filter((review) => !review.vendorReply).length ?? 0;
  const pendingQuestions = questions.data?.filter((question) => question.status !== "answered").length ?? 0;
  const average = reviews.data?.length ? (reviews.data.reduce((total, review) => total + review.rating, 0) / reviews.data.length).toFixed(1) : "0.0";
  const error = reviews.error || questions.error;

  return <Screen eyebrow="SELLER CENTER" title="Reviews and Q&A" description="Build buyer trust by responding quickly and professionally.">
    {reviews.isLoading || questions.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
    <View style={styles.metrics}><Metric label="Average rating" value={`${average}/5`} /><Metric label="Reviews to reply" value={String(pendingReviews)} /><Metric label="Questions waiting" value={String(pendingQuestions)} /></View>
    <View style={styles.grid}>
      <Pressable accessibilityRole="link" onPress={() => router.push("/vendor/reviews")} style={({ pressed }) => [styles.card, pressed && styles.pressed]}><View style={styles.icon}><Ionicons color={colors.primary} name="star-outline" size={25} /></View><Text style={styles.title}>Customer reviews</Text><Text style={styles.copy}>Read verified feedback, filter ratings, and publish seller replies.</Text><Text style={styles.link}>Open reviews</Text></Pressable>
      <Pressable accessibilityRole="link" onPress={() => router.push("/vendor/questions")} style={({ pressed }) => [styles.card, pressed && styles.pressed]}><View style={styles.icon}><Ionicons color={colors.primary} name="chatbox-ellipses-outline" size={25} /></View><Text style={styles.title}>Product questions</Text><Text style={styles.copy}>Answer pre-purchase questions with product-specific guidance.</Text><Text style={styles.link}>Open Q&A</Text></Pressable>
    </View>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error.message}</Text> : null}
  </Screen>;
}

function Metric({ label, value }: { label: string; value: string }) { return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.copy}>{label}</Text></View>; }
const styles = StyleSheet.create({ metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, metric: { backgroundColor: colors.primarySoft, borderRadius: radius.lg, flex: 1, minWidth: 130, padding: spacing.md }, metricValue: { color: colors.primary, fontSize: 25, fontWeight: "700" }, grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, card: { backgroundColor: colors.surface, borderRadius: radius.xl, flex: 1, gap: spacing.sm, minWidth: 270, padding: spacing.xl }, pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] }, icon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.lg, height: 52, justifyContent: "center", width: 52 }, title: { color: colors.text, fontSize: 19, fontWeight: "700" }, copy: { color: colors.muted, fontSize: 12, lineHeight: 18 }, link: { color: colors.primary, fontWeight: "700", marginTop: spacing.sm }, error: { color: colors.danger } });
