import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { getAdminQuestions, getAdminReviews, moderateAdminQuestion, moderateAdminReview } from "../engagement/engagement.api";

export function AdminContentScreen({ mode = "all" }: { mode?: "all" | "reviews" | "questions" }) {
  const user = firebaseAuth?.currentUser ?? null; const queryClient = useQueryClient(); const showReviews = mode !== "questions"; const showQuestions = mode !== "reviews";
  const reviews = useQuery({ queryKey: ["admin", "reviews"], queryFn: () => getAdminReviews(user!), enabled: Boolean(user && showReviews) });
  const questions = useQuery({ queryKey: ["admin", "questions"], queryFn: () => getAdminQuestions(user!), enabled: Boolean(user && showQuestions) });
  const reviewAction = useMutation({ mutationFn: ({ id, status }: { id: string; status: "published" | "hidden" }) => moderateAdminReview(user!, id, { status, reason: status === "hidden" ? "Hidden after content policy review" : "Published after content policy review" }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] }) });
  const questionAction = useMutation({ mutationFn: ({ id, status }: { id: string; status: "published" | "hidden" }) => moderateAdminQuestion(user!, id, { status, reason: status === "hidden" ? "Hidden after content policy review" : "Published after content policy review" }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "questions"] }) });
  const title = mode === "reviews" ? "Review moderation" : mode === "questions" ? "Product Q&A" : "Content moderation";
  return <Screen eyebrow="ADMIN CONTENT" title={title} description="Moderate marketplace reviews and product questions with immutable audit records.">
    {reviews.isLoading || questions.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
    {showReviews ? <><View style={styles.section}><Text style={styles.heading}>Reviews</Text><Text style={styles.count}>{reviews.data?.length ?? 0} records</Text></View>{reviews.data?.map((review) => <ModuleCard key={review.id} title={review.productName || "Review"} meta={`${review.rating}/5 · ${review.authorName} · ${review.status}`}><Text style={styles.body}>{review.body || review.title || "No written comment"}</Text><Actions status={review.status || "published"} onPress={(status) => reviewAction.mutate({ id: review.id, status })} /></ModuleCard>)}</> : null}
    {showQuestions ? <><View style={styles.section}><Text style={styles.heading}>Questions</Text><Text style={styles.count}>{questions.data?.length ?? 0} records</Text></View>{questions.data?.map((question) => <ModuleCard key={question.id} title={question.productName || "Question"} meta={`${question.authorName} · ${question.status}`}><Text style={styles.body}>{question.body}</Text><Actions status={question.status} onPress={(status) => questionAction.mutate({ id: question.id, status })} /></ModuleCard>)}</> : null}
  </Screen>;
}
function Actions({ status, onPress }: { status: string; onPress(status: "published" | "hidden"): void }) { return <View style={styles.actions}>{(["published", "hidden"] as const).map((item) => <Pressable disabled={status === item} key={item} onPress={() => onPress(item)} style={[styles.chip, status === item && styles.active]}><Text style={[styles.chipText, status === item && styles.activeText]}>{item.toUpperCase()}</Text></Pressable>)}</View>; }
const styles = StyleSheet.create({ section: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, heading: { color: colors.text, fontSize: 21, fontWeight: "700" }, count: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, color: colors.primary, fontSize: 10, fontWeight: "700", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5 }, body: { color: colors.text, lineHeight: 21 }, actions: { flexDirection: "row", gap: spacing.sm }, chip: { borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 }, active: { backgroundColor: colors.primary }, chipText: { color: colors.text, fontSize: 10, fontWeight: "700" }, activeText: { color: "#fff" } });
