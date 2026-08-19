import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { getVendorReviews, replyToVendorReview } from "../engagement/engagement.api";

type ReviewFilter = "all" | "pending" | "replied" | "5" | "4" | "3" | "2" | "1";

export function VendorReviewsScreen() {
  const user = firebaseAuth?.currentUser ?? null;
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const reviews = useQuery({ queryKey: ["vendor", "reviews"], queryFn: () => getVendorReviews(user!), enabled: Boolean(user) });
  const saveReply = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => replyToVendorReview(user!, id, body),
    onSuccess: (data) => {
      queryClient.setQueryData(["vendor", "reviews"], data);
      setEditingId(null);
      setReply("");
    }
  });
  const filtered = useMemo(() => (reviews.data ?? []).filter((review) => {
    if (filter === "pending") return !review.vendorReply;
    if (filter === "replied") return Boolean(review.vendorReply);
    if (filter !== "all") return review.rating === Number(filter);
    return true;
  }), [filter, reviews.data]);
  const pending = (reviews.data ?? []).filter((review) => !review.vendorReply).length;
  const average = reviews.data?.length ? (reviews.data.reduce((sum, review) => sum + review.rating, 0) / reviews.data.length).toFixed(1) : "0.0";

  return <Screen eyebrow="SELLER CENTER" title="Customer reviews" description="Monitor verified feedback and respond professionally to every buyer.">
    <View style={styles.metrics}><Metric label="Average rating" value={`${average}/5`} /><Metric label="Total reviews" value={String(reviews.data?.length ?? 0)} /><Metric label="Need reply" value={String(pending)} /></View>
    <View style={styles.filters}>{(["all", "pending", "replied", "5", "4", "3", "2", "1"] as ReviewFilter[]).map((item) => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.chip, filter === item && styles.activeChip]}><Text style={[styles.chipText, filter === item && styles.activeChipText]}>{item === "all" ? "All" : item === "pending" ? "Need reply" : item === "replied" ? "Replied" : `${item} star`}</Text></Pressable>)}</View>
    {reviews.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
    {reviews.error ? <Text style={styles.error}>{reviews.error.message}</Text> : null}
    {filtered.map((review) => <ModuleCard key={review.id} title={review.productName || "Product review"} meta={`${review.verifiedPurchase ? "Verified purchase · " : ""}${new Date(review.createdAt).toLocaleDateString("en-BD")}`}>
      <View style={styles.reviewTop}><Text style={styles.stars}>{"★".repeat(review.rating)}<Text style={styles.emptyStars}>{"★".repeat(5 - review.rating)}</Text></Text><Text style={[styles.badge, review.vendorReply ? styles.replied : styles.pending]}>{review.vendorReply ? "Replied" : "Needs reply"}</Text></View>
      <Text style={styles.author}>{review.authorName}</Text>{review.title ? <Text style={styles.reviewTitle}>{review.title}</Text> : null}<Text style={styles.body}>{review.body || "No written comment"}</Text>
      {review.vendorReply ? <View style={styles.replyBox}><Text style={styles.replyLabel}>Your reply</Text><Text style={styles.body}>{review.vendorReply}</Text></View> : null}
      {editingId === review.id ? <View style={styles.editor}><TextInput multiline onChangeText={setReply} placeholder="Write a clear, professional seller reply..." placeholderTextColor={colors.muted} style={styles.input} value={reply} /><View style={styles.actions}><Pressable disabled={saveReply.isPending || reply.trim().length < 2} onPress={() => saveReply.mutate({ id: review.id, body: reply.trim() })} style={[styles.button, reply.trim().length < 2 && styles.disabled]}><Text style={styles.buttonText}>{saveReply.isPending ? "Posting..." : "Post reply"}</Text></Pressable><Pressable onPress={() => { setEditingId(null); setReply(""); }} style={styles.outline}><Text style={styles.outlineText}>Cancel</Text></Pressable></View>{saveReply.error ? <Text style={styles.error}>{saveReply.error.message}</Text> : null}</View> : <Pressable onPress={() => { setEditingId(review.id); setReply(review.vendorReply ?? ""); }} style={styles.outline}><Text style={styles.outlineText}>{review.vendorReply ? "Edit reply" : "Reply to review"}</Text></Pressable>}
    </ModuleCard>)}
    {!reviews.isLoading && filtered.length === 0 ? <ModuleCard title="No matching reviews" meta="New customer feedback will appear here." /> : null}
  </Screen>;
}

function Metric({ label, value }: { label: string; value: string }) { return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.muted}>{label}</Text></View>; }
const styles = StyleSheet.create({ metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, metric: { backgroundColor: colors.primarySoft, borderRadius: radius.lg, flex: 1, minWidth: 130, padding: spacing.md }, metricValue: { color: colors.primary, fontSize: 25, fontWeight: "700" }, muted: { color: colors.muted, fontSize: 12 }, filters: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, chip: { borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 }, activeChip: { backgroundColor: colors.primary, borderColor: colors.primary }, chipText: { color: colors.text, fontSize: 12, fontWeight: "600" }, activeChipText: { color: "#fff" }, reviewTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, stars: { color: "#f59e0b", fontSize: 19, letterSpacing: 2 }, emptyStars: { color: "#dbe2ea" }, badge: { borderRadius: radius.pill, fontSize: 11, fontWeight: "700", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 5 }, pending: { backgroundColor: "#fff7ed", color: "#c2410c" }, replied: { backgroundColor: "#ecfdf5", color: "#047857" }, author: { color: colors.muted, fontSize: 12, fontWeight: "700" }, reviewTitle: { color: colors.text, fontWeight: "700" }, body: { color: colors.text, lineHeight: 21 }, replyBox: { backgroundColor: colors.primarySoft, borderLeftColor: colors.primary, borderLeftWidth: 3, borderRadius: radius.md, gap: 5, padding: spacing.md }, replyLabel: { color: colors.primaryDark, fontSize: 12, fontWeight: "700", textTransform: "uppercase" }, editor: { gap: spacing.sm }, input: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 100, padding: 12, textAlignVertical: "top" }, actions: { flexDirection: "row", gap: spacing.sm }, button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.lg }, disabled: { opacity: 0.45 }, buttonText: { color: "#fff", fontWeight: "700" }, outline: { alignItems: "center", borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, justifyContent: "center", minHeight: 42, paddingHorizontal: spacing.md }, outlineText: { color: colors.primary, fontWeight: "700" }, error: { color: colors.danger } });
