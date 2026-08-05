import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { getMyReviews } from "./engagement.api";

export function MyReviewsScreen() {
  const router = useRouter();
  const user = firebaseAuth?.currentUser ?? null;
  const reviews = useQuery({ queryKey: ["reviews", "mine"], queryFn: () => getMyReviews(user!), enabled: Boolean(user) });
  const average = reviews.data?.length ? reviews.data.reduce((sum, item) => sum + item.rating, 0) / reviews.data.length : 0;
  const verified = reviews.data?.filter((review) => review.verifiedPurchase).length ?? 0;

  if (!user) return <ReviewState title="Your reviews live here" copy="Sign in to see feedback from your verified purchases." action="Sign in" onPress={() => router.replace("/auth")} />;
  if (reviews.isLoading) return <ReviewState loading title="Loading your reviews" copy="Fetching your published feedback." />;
  if (reviews.error) return <ReviewState title="Could not load reviews" copy={reviews.error.message} action="Try again" onPress={() => reviews.refetch()} />;

  return <Screen eyebrow="YOUR VOICE" title="My reviews" description="Your product feedback helps other Amiyo-Go shoppers buy with confidence.">
    <View style={styles.summary}><View style={styles.ratingBlock}><Text accessibilityRole="header" style={styles.score}>{average.toFixed(1)}</Text><RatingStars rating={Math.round(average)} size={21} /><Text style={styles.summaryMuted}>Average rating</Text></View><View style={styles.summaryDivider} /><View style={styles.stat}><Text style={styles.statNumber}>{reviews.data?.length ?? 0}</Text><Text style={styles.summaryMuted}>Published</Text></View><View style={styles.stat}><Text style={styles.statNumber}>{verified}</Text><Text style={styles.summaryMuted}>Verified</Text></View><Ionicons color="#7dd3fc" name="chatbox-ellipses-outline" size={35} /></View>
    {reviews.data?.length ? <View style={styles.list}>{reviews.data.map((review) => <View key={review.id} style={styles.card}><View style={styles.cardHeader}><View style={styles.productIcon}><Ionicons color={colors.primary} name="cube-outline" size={22} /></View><View style={styles.flex}><Text style={styles.productName}>{review.productName || "Reviewed product"}</Text><Text style={styles.date}>{new Date(review.createdAt).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}</Text></View>{review.verifiedPurchase ? <View style={styles.verified}><Ionicons color={colors.success} name="checkmark-circle" size={14} /><Text style={styles.verifiedText}>Verified</Text></View> : null}</View><RatingStars rating={review.rating} size={18} />{review.title ? <Text style={styles.title}>{review.title}</Text> : null}{review.body ? <Text style={styles.body}>{review.body}</Text> : <Text style={styles.bodyMuted}>Rating submitted without a written review.</Text>}<Pressable accessibilityRole="link" onPress={() => router.push(`/product/${review.productSlug || review.productId}` as never)} style={styles.productLink}><Text style={styles.linkText}>View product</Text><Ionicons color={colors.primary} name="arrow-forward" size={16} /></Pressable></View>)}</View> : <View style={styles.empty}><Ionicons color={colors.primary} name="star-outline" size={52} /><Text style={styles.emptyTitle}>No reviews yet</Text><Text style={styles.muted}>After a delivered order, open the product page to share your experience.</Text><Pressable onPress={() => router.push("/orders")} style={styles.primary}><Text style={styles.primaryText}>View my orders</Text></Pressable></View>}
  </Screen>;
}

function RatingStars({ rating, size }: { rating: number; size: number }) {
  return <View accessibilityLabel={`${rating} out of 5 stars`} style={styles.stars}>{Array.from({ length: 5 }, (_, index) => <Ionicons color={index < rating ? "#f59e0b" : "#cbd5e1"} key={index} name={index < rating ? "star" : "star-outline"} size={size} />)}</View>;
}

function ReviewState({ action, copy, loading, onPress, title }: { action?: string; copy: string; loading?: boolean; onPress?: () => void; title: string }) {
  return <Screen eyebrow="YOUR VOICE" title={title} description={copy}><View style={styles.empty}>{loading ? <ActivityIndicator color={colors.primary} size="large" /> : <Ionicons color={colors.primary} name="chatbox-ellipses-outline" size={52} />}{action && onPress ? <Pressable onPress={onPress} style={styles.primary}><Text style={styles.primaryText}>{action}</Text></Pressable> : null}</View></Screen>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, summary: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", flexWrap: "wrap", gap: spacing.lg, padding: spacing.lg }, ratingBlock: { gap: 4, minWidth: 145 }, score: { color: colors.surface, fontSize: 42, fontWeight: "900" }, stars: { flexDirection: "row", gap: 2 }, summaryMuted: { color: "#cbd5e1", fontSize: 12 }, summaryDivider: { alignSelf: "stretch", backgroundColor: "#334155", width: 1 }, stat: { gap: 4, minWidth: 76 }, statNumber: { color: colors.surface, fontSize: 26, fontWeight: "900" }, list: { gap: spacing.md }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, padding: spacing.lg }, cardHeader: { alignItems: "center", flexDirection: "row", gap: spacing.sm }, productIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 42, justifyContent: "center", width: 42 }, productName: { color: colors.text, fontSize: 16, fontWeight: "900" }, date: { color: colors.muted, fontSize: 11, marginTop: 3 }, verified: { alignItems: "center", backgroundColor: "#ecfdf5", borderRadius: radius.pill, flexDirection: "row", gap: 4, paddingHorizontal: 9, paddingVertical: 6 }, verifiedText: { color: colors.success, fontSize: 10, fontWeight: "900" }, title: { color: colors.text, fontSize: 17, fontWeight: "900" }, body: { color: colors.muted, lineHeight: 22 }, bodyMuted: { color: colors.muted, fontStyle: "italic" }, productLink: { alignItems: "center", alignSelf: "flex-start", borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", gap: 6, paddingTop: spacing.md }, linkText: { color: colors.primary, fontWeight: "900" }, empty: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderStyle: "dashed", borderWidth: 1, gap: spacing.md, padding: 44 }, emptyTitle: { color: colors.text, fontSize: 22, fontWeight: "900" }, muted: { color: colors.muted, lineHeight: 20, textAlign: "center" }, primary: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 13 }, primaryText: { color: colors.surface, fontWeight: "900" }
});
