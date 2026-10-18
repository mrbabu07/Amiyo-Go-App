import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "firebase/auth";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { answerVendorQuestion, getVendorQuestions } from "../engagement/engagement.api";

type QuestionFilter = "all" | "pending" | "answered";

export function VendorQuestionsScreen() {
  const compact = useWindowDimensions().width < 620;
  const user = useCurrentUser();
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<QuestionFilter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  useEffect(() => { setEditingId(null); setAnswerText(""); }, [user?.uid]);

  const questions = useQuery({ queryKey: ["vendor", "questions", user?.uid], queryFn: () => getVendorQuestions(user!), enabled: Boolean(user) });
  const answer = useMutation({ retry: false, mutationFn: ({ owner, id, body }: { owner: User; id: string; body: string }) => answerVendorQuestion(owner, id, body), onSuccess: async (_data, variables) => { if (activeUid.current !== variables.owner.uid) return; setEditingId(null); setAnswerText(""); await queryClient.invalidateQueries({ queryKey: ["vendor", "questions", variables.owner.uid] }); } });
  const pending = (questions.data ?? []).filter((question) => question.status !== "answered").length;
  const answered = (questions.data?.length ?? 0) - pending;
  const responseRate = questions.data?.length ? Math.round((answered / questions.data.length) * 100) : 0;
  const filtered = useMemo(() => (questions.data ?? []).filter((question) => filter === "all" || (filter === "pending" ? question.status !== "answered" : question.status === "answered")), [filter, questions.data]);

  return <Screen eyebrow="SELLER CENTER" title="Product questions" description="Answer buyer questions quickly to improve confidence and conversion.">
    <View style={[styles.hero, compact && styles.heroCompact]}><View style={styles.heroIcon}><Ionicons color={colors.primary} name="chatbox-ellipses-outline" size={26} /></View><View style={styles.heroCopy}><Text style={styles.heroEyebrow}>BUYER CONFIDENCE</Text><Text style={styles.heroTitle}>Answer before shoppers leave</Text><Text style={styles.heroText}>Resolve product questions with accurate public answers and never request personal or payment information.</Text></View><View style={styles.rate}><Text style={styles.rateValue}>{responseRate}%</Text><Text style={styles.rateLabel}>answer rate</Text></View></View>
    <View style={styles.metrics}><Metric label="All questions" value={questions.data?.length ?? 0} /><Metric label="Unanswered" value={pending} /><Metric label="Answered" value={answered} /></View>
    <View style={styles.filters}>{(["all", "pending", "answered"] as QuestionFilter[]).map((item) => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.chip, filter === item && styles.activeChip]}><Text style={[styles.chipText, filter === item && styles.activeChipText]}>{item === "all" ? "All" : item === "pending" ? `Unanswered (${pending})` : "Answered"}</Text></Pressable>)}</View>
    {questions.isLoading ? <ActivityIndicator color={colors.primary} /> : null}{questions.error ? <Text style={styles.error}>{questions.error.message}</Text> : null}
    {filtered.map((question) => <ModuleCard key={question.id} title={question.productName || "Product question"} meta={`${question.authorName} · ${new Date(question.createdAt).toLocaleDateString("en-BD")}`}>
      <View style={[styles.questionTop, compact && styles.questionTopCompact]}><Text style={styles.question}>{question.body}</Text><Text style={[styles.badge, question.status === "answered" ? styles.answered : styles.pending]}>{question.status === "answered" ? "Answered" : "Needs answer"}</Text></View>
      {question.answers.map((item) => <View key={item.id} style={styles.answerBox}><Text style={styles.answerLabel}>Seller answer</Text><Text style={styles.body}>{item.body}</Text></View>)}
      {editingId === question.id ? <View style={styles.editor}><TextInput multiline onChangeText={setAnswerText} placeholder="Write a clear, helpful answer..." placeholderTextColor={colors.muted} style={styles.input} value={answerText} /><View style={[styles.actions, compact && styles.actionsCompact]}><Pressable disabled={!user || answer.isPending || answerText.trim().length < 2} onPress={() => user && answer.mutate({ owner: user, id: question.id, body: answerText.trim() })} style={[styles.button, compact && styles.actionCompact, answerText.trim().length < 2 && styles.disabled]}><Text style={styles.buttonText}>{answer.isPending ? "Publishing..." : "Publish answer"}</Text></Pressable><Pressable onPress={() => { setEditingId(null); setAnswerText(""); }} style={[styles.outline, compact && styles.actionCompact]}><Text style={styles.outlineText}>Cancel</Text></Pressable></View>{answer.error ? <Text accessibilityRole="alert" style={styles.error}>{answer.error.message}</Text> : null}</View> : question.status !== "answered" ? <Pressable onPress={() => setEditingId(question.id)} style={styles.outline}><Text style={styles.outlineText}>Answer this question</Text></Pressable> : null}
    </ModuleCard>)}
    {!questions.isLoading && filtered.length === 0 ? <ModuleCard title="No matching questions" meta="Buyer questions will appear here." /> : null}
  </Screen>;
}

function Metric({ label, value }: { label: string; value: number }) { return <View style={styles.metric}><Text adjustsFontSizeToFit numberOfLines={1} style={styles.metricValue}>{value}</Text><Text style={styles.muted}>{label}</Text></View>; }
const styles = StyleSheet.create({
  hero: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", gap: spacing.md, padding: spacing.lg }, heroCompact: { alignItems: "flex-start", flexDirection: "column" }, heroIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.lg, height: 52, justifyContent: "center", width: 52 }, heroCopy: { flex: 1, gap: 4 }, heroEyebrow: { color: colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 1.2 }, heroTitle: { color: colors.background, fontSize: 20, fontWeight: "700" }, heroText: { color: colors.background, fontSize: 12, lineHeight: 18, opacity: 0.8 }, rate: { alignItems: "flex-end" }, rateValue: { color: colors.accent, fontSize: 28, fontWeight: "700" }, rateLabel: { color: colors.background, fontSize: 11, opacity: 0.75 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, metric: { backgroundColor: colors.primarySoft, borderRadius: radius.lg, flex: 1, minWidth: 110, padding: spacing.md }, metricValue: { color: colors.primary, fontSize: 25, fontWeight: "700" }, muted: { color: colors.muted, fontSize: 12 }, body: { color: colors.text, lineHeight: 21 }, filters: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, chip: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 9 }, activeChip: { backgroundColor: colors.primary }, chipText: { color: colors.text, fontSize: 12, fontWeight: "600" }, activeChipText: { color: colors.background }, questionTop: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }, questionTopCompact: { flexDirection: "column" }, question: { color: colors.text, flex: 1, fontSize: 16, fontWeight: "600", lineHeight: 23 }, badge: { borderRadius: radius.pill, fontSize: 10, fontWeight: "700", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5 }, pending: { backgroundColor: colors.primarySoft, color: colors.primary }, answered: { backgroundColor: colors.accentSoft, color: colors.success }, answerBox: { backgroundColor: colors.accentSoft, borderLeftColor: colors.accent, borderLeftWidth: 3, borderRadius: radius.md, gap: 5, padding: spacing.md }, answerLabel: { color: colors.navy, fontSize: 11, fontWeight: "700", textTransform: "uppercase" }, editor: { gap: spacing.sm }, input: { backgroundColor: colors.background, borderRadius: radius.md, color: colors.text, minHeight: 100, padding: 12, textAlignVertical: "top" }, actions: { flexDirection: "row", gap: spacing.sm }, actionsCompact: { flexDirection: "column" }, actionCompact: { width: "100%" }, button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.lg }, disabled: { opacity: 0.45 }, buttonText: { color: colors.background, fontWeight: "700" }, outline: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, justifyContent: "center", minHeight: 42, paddingHorizontal: spacing.md }, outlineText: { color: colors.primary, fontWeight: "700" }, error: { color: colors.danger }
});
