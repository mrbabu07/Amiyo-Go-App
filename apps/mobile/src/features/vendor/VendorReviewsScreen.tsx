import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@firebase/auth";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getVendorReviews, replyToVendorReview } from "../engagement/engagement.api";

type ReviewFilter = "all" | "pending" | "replied" | "5" | "4" | "3" | "2" | "1";

export function VendorReviewsScreen() {
  const compact = useWindowDimensions().width < 620;
  const user = useCurrentUser();
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  useEffect(() => { setEditingId(null); setReply(""); }, [user?.uid]);

  const reviews = useQuery({ queryKey: ["vendor", "reviews", user?.uid], queryFn: () => getVendorReviews(user!), enabled: Boolean(user) });
  const saveReply = useMutation({ retry: false, mutationFn: ({ owner, id, body }: { owner: User; id: string; body: string }) => replyToVendorReview(owner, id, body), onSuccess: (data, variables) => { if (activeUid.current !== variables.owner.uid) return; queryClient.setQueryData(["vendor", "reviews", variables.owner.uid], data); setEditingId(null); setReply(""); } });
  const filtered = useMemo(() => (reviews.data ?? []).filter((review) => { if (filter === "pending") return !review.vendorReply; if (filter === "replied") return Boolean(review.vendorReply); return filter === "all" || review.rating === Number(filter); }), [filter, reviews.data]);
  const pending = (reviews.data ?? []).filter((review) => !review.vendorReply).length;
  const replied = (reviews.data?.length ?? 0) - pending;
  const responseRate = reviews.data?.length ? Math.round((replied / reviews.data.length) * 100) : 0;
  const average = reviews.data?.length ? (reviews.data.reduce((sum, review) => sum + review.rating, 0) / reviews.data.length).toFixed(1) : "0.0";

  return <Screen eyebrow="SELLER CENTER" title="Customer reviews" description="Monitor verified feedback and respond professionally to every buyer.">
    <View style={[styles.hero, compact && styles.heroCompact]}><View style={styles.heroIcon}><Ionicons color={colors.primary} name="shield-checkmark-outline" size={26} /></View><View style={styles.heroCopy}><Text style={styles.heroEyebrow}>STORE REPUTATION</Text><Text style={styles.heroTitle}>Turn buyer feedback into trust</Text><Text style={styles.heroText}>Prioritize unanswered reviews and keep every public response clear, helpful, and professional.</Text></View><View style={styles.rate}><Text style={styles.rateValue}>{responseRate}%</Text><Text style={styles.rateLabel}>response rate</Text></View></View>
    <View style={styles.metrics}><Metric label="Average rating" value={`${average}/5`} /><Metric label="Total reviews" value={String(reviews.data?.length ?? 0)} /><Metric label="Need reply" value={String(pending)} /></View>
    <View style={styles.filters}>{(["all", "pending", "replied", "5", "4", "3", "2", "1"] as ReviewFilter[]).map((item) => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.chip, filter === item && styles.activeChip]}><Text style={[styles.chipText, filter === item && styles.activeChipText]}>{item === "all" ? "All" : item === "pending" ? "Need reply" : item === "replied" ? "Replied" : `${item} star`}</Text></Pressable>)}</View>
    {reviews.isLoading ? <ActivityIndicator color={colors.primary} /> : null}{reviews.error ? <Text style={styles.error}>{reviews.error.message}</Text> : null}
    {filtered.map((review) => <ModuleCard key={review.id} title={review.productName || "Product review"} meta={`${review.verifiedPurchase ? "Verified purchase · " : ""}${new Date(review.createdAt).toLocaleDateString("en-BD")}`}>
      <View style={[styles.reviewTop, compact && styles.reviewTopCompact]}><View style={styles.ratingRow}><Ionicons color={colors.warning} name="star" size={18} /><Text style={styles.ratingValue}>{review.rating}.0</Text><Text style={styles.ratingOutOf}>/ 5</Text></View><Text style={[styles.badge, review.vendorReply ? styles.replied : styles.pending]}>{review.vendorReply ? "Replied" : "Needs reply"}</Text></View>
      <Text style={styles.author}>{review.authorName}</Text>{review.title ? <Text style={styles.reviewTitle}>{review.title}</Text> : null}<Text style={styles.body}>{review.body || "No written comment"}</Text>
      {review.vendorReply ? <View style={styles.replyBox}><Text style={styles.replyLabel}>Your reply</Text><Text style={styles.body}>{review.vendorReply}</Text></View> : null}
      {editingId === review.id ? <View style={styles.editor}><TextInput multiline onChangeText={setReply} placeholder="Write a clear, professional seller reply..." placeholderTextColor={colors.muted} style={styles.input} value={reply} /><View style={[styles.actions, compact && compactStyles.actions]}><Pressable disabled={!user || saveReply.isPending || reply.trim().length < 2} onPress={() => user && saveReply.mutate({ owner: user, id: review.id, body: reply.trim() })} style={[styles.button, compact && compactStyles.action, reply.trim().length < 2 && styles.disabled]}><Text style={styles.buttonText}>{saveReply.isPending ? "Posting..." : "Post reply"}</Text></Pressable><Pressable onPress={() => { setEditingId(null); setReply(""); }} style={[styles.outline, compact && compactStyles.action]}><Text style={styles.outlineText}>Cancel</Text></Pressable></View>{saveReply.error ? <Text accessibilityRole="alert" style={styles.error}>{saveReply.error.message}</Text> : null}</View> : <Pressable onPress={() => { setEditingId(review.id); setReply(review.vendorReply ?? ""); }} style={styles.outline}><Text style={styles.outlineText}>{review.vendorReply ? "Edit reply" : "Reply to review"}</Text></Pressable>}
    </ModuleCard>)}
    {!reviews.isLoading && filtered.length === 0 ? <ModuleCard title="No matching reviews" meta="New customer feedback will appear here." /> : null}
  </Screen>;
}

const compactStyles = StyleSheet.create({ actions: { flexDirection: "column" }, action: { width: "100%" } });
function Metric({ label, value }: { label: string; value: string }) { return <View style={styles.metric}><Text adjustsFontSizeToFit numberOfLines={1} style={styles.metricValue}>{value}</Text><Text style={styles.muted}>{label}</Text></View>; }
const styles = StyleSheet.create({
  hero: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", gap: spacing.md, padding: spacing.lg }, heroCompact: { alignItems: "flex-start", flexDirection: "column" }, heroIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.lg, height: 52, justifyContent: "center", width: 52 }, heroCopy: { flex: 1, gap: 4 }, heroEyebrow: { color: colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 1.2 }, heroTitle: { color: colors.background, fontSize: 20, fontWeight: "700" }, heroText: { color: colors.background, fontSize: 12, lineHeight: 18, opacity: 0.8 }, rate: { alignItems: "flex-end" }, rateValue: { color: colors.accent, fontSize: 28, fontWeight: "700" }, rateLabel: { color: colors.background, fontSize: 11, opacity: 0.75 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, metric: { backgroundColor: colors.primarySoft, borderRadius: radius.lg, flex: 1, minWidth: 110, padding: spacing.md }, metricValue: { color: colors.primary, fontSize: 25, fontWeight: "700" }, muted: { color: colors.muted, fontSize: 12 }, filters: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, chip: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 9 }, activeChip: { backgroundColor: colors.primary }, chipText: { color: colors.text, fontSize: 12, fontWeight: "600" }, activeChipText: { color: colors.background }, reviewTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, reviewTopCompact: { alignItems: "flex-start", gap: spacing.sm }, ratingRow: { alignItems: "center", flexDirection: "row", gap: 5 }, ratingValue: { color: colors.text, fontSize: 17, fontWeight: "700" }, ratingOutOf: { color: colors.muted, fontSize: 12 }, badge: { borderRadius: radius.pill, fontSize: 11, fontWeight: "700", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 5 }, pending: { backgroundColor: colors.primarySoft, color: colors.primary }, replied: { backgroundColor: colors.accentSoft, color: colors.success }, author: { color: colors.muted, fontSize: 12, fontWeight: "700" }, reviewTitle: { color: colors.text, fontWeight: "700" }, body: { color: colors.text, lineHeight: 21 }, replyBox: { backgroundColor: colors.accentSoft, borderLeftColor: colors.accent, borderLeftWidth: 3, borderRadius: radius.md, gap: 5, padding: spacing.md }, replyLabel: { color: colors.navy, fontSize: 12, fontWeight: "700", textTransform: "uppercase" }, editor: { gap: spacing.sm }, input: { backgroundColor: colors.background, borderRadius: radius.md, color: colors.text, minHeight: 100, padding: 12, textAlignVertical: "top" }, actions: { flexDirection: "row", gap: spacing.sm }, button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.lg }, disabled: { opacity: 0.45 }, buttonText: { color: colors.background, fontWeight: "700" }, outline: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, justifyContent: "center", minHeight: 42, paddingHorizontal: spacing.md }, outlineText: { color: colors.primary, fontWeight: "700" }, error: { color: colors.danger }
});
