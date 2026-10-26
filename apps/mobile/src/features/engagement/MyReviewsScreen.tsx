import { ReviewImages } from "./ReviewImages";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getMyReviews } from "./engagement.api";

export function MyReviewsScreen() {
  const compact = useWindowDimensions().width < 620;
  const router = useRouter();
  const user = useCurrentUser();
  const reviews = useQuery({ queryKey: ["reviews", "mine", user?.uid], queryFn: () => getMyReviews(user!), enabled: Boolean(user), retry: false });
  const average = reviews.data?.length ? reviews.data.reduce((sum, item) => sum + item.rating, 0) / reviews.data.length : 0;
  const verified = reviews.data?.filter((review) => review.verifiedPurchase).length ?? 0;

  if (!user) return <ReviewState title="Your reviews live here" copy="Sign in to see feedback from your verified purchases." action="Sign in" onPress={() => router.replace("/auth")} />;
  if (reviews.isLoading) return <ReviewState loading title="Loading your reviews" copy="Fetching your published feedback." />;
  if (reviews.error) return <ReviewState title="Could not load reviews" copy={reviews.error.message} action="Try again" onPress={() => reviews.refetch()} />;

  return <Screen eyebrow="YOUR VOICE" title="My reviews" description="Your product feedback helps other Amiyo-Go shoppers buy with confidence.">
    <View style={[styles.summary, compact && styles.summaryCompact]}><View style={[styles.ratingBlock, compact && styles.ratingBlockCompact]}><Text accessibilityRole="header" style={styles.score}>{average.toFixed(1)}</Text><RatingStars rating={Math.round(average)} size={21} /><Text style={styles.summaryMuted}>Average rating</Text></View><View style={[styles.summaryDivider, compact && styles.summaryDividerCompact]} /><View style={styles.stat}><Text style={styles.statNumber}>{reviews.data?.length ?? 0}</Text><Text style={styles.summaryMuted}>Published</Text></View><View style={styles.stat}><Text style={styles.statNumber}>{verified}</Text><Text style={styles.summaryMuted}>Verified</Text></View><Ionicons color={colors.shellAccent} name="chatbox-ellipses-outline" size={35} /></View>
    {reviews.data?.length ? <View style={styles.list}>{reviews.data.map((review) => <View key={review.id} style={styles.card}><View style={styles.cardHeader}><View style={styles.productIcon}><Ionicons color={colors.primary} name="cube-outline" size={22} /></View><View style={styles.flex}><Text style={styles.productName}>{review.productName || "Reviewed product"}</Text><Text style={styles.date}>{new Date(review.createdAt).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}</Text></View>{review.verifiedPurchase ? <View style={styles.verified}><Ionicons color={colors.success} name="checkmark-circle" size={14} /><Text style={styles.verifiedText}>Verified</Text></View> : null}</View><RatingStars rating={review.rating} size={18} />{review.title ? <Text style={styles.title}>{review.title}</Text> : null}{review.body ? <Text style={styles.body}>{review.body}</Text> : <Text style={styles.bodyMuted}>Rating submitted without a written review.</Text>}<ReviewImages images={review.images} /><Pressable accessibilityRole="link" onPress={() => router.push(`/product/${review.productSlug || review.productId}` as never)} style={styles.productLink}><Text style={styles.linkText}>View product</Text><Ionicons color={colors.primary} name="arrow-forward" size={16} /></Pressable></View>)}</View> : <View style={styles.empty}><Ionicons color={colors.primary} name="star-outline" size={52} /><Text style={styles.emptyTitle}>No reviews yet</Text><Text style={styles.muted}>After a delivered order, open the product page to share your experience.</Text><Pressable onPress={() => router.push("/orders")} style={styles.primary}><Text style={styles.primaryText}>View my orders</Text></Pressable></View>}
  </Screen>;
}

function RatingStars({ rating, size }: { rating: number; size: number }) {
  return <View accessibilityLabel={`${rating} out of 5 stars`} style={styles.stars}>{Array.from({ length: 5 }, (_, index) => <Ionicons color={index < rating ? "#f59e0b" : colors.border} key={index} name={index < rating ? "star" : "star-outline"} size={size} />)}</View>;
}

function ReviewState({ action, copy, loading, onPress, title }: { action?: string; copy: string; loading?: boolean; onPress?: () => void; title: string }) {
  return <Screen eyebrow="YOUR VOICE" title={title} description={copy}><View style={styles.empty}>{loading ? <ActivityIndicator color={colors.primary} size="large" /> : <Ionicons color={colors.primary} name="chatbox-ellipses-outline" size={52} />}{action && onPress ? <Pressable onPress={onPress} style={styles.primary}><Text style={styles.primaryText}>{action}</Text></Pressable> : null}</View></Screen>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, summary: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", flexWrap: "wrap", gap: spacing.lg, padding: spacing.lg }, summaryCompact: { alignItems: "stretch", gap: spacing.md }, ratingBlock: { gap: 4, minWidth: 145 }, ratingBlockCompact: { flexBasis: "100%", minWidth: 0 }, score: { color: colors.surface, fontSize: 42, fontWeight: "700" }, stars: { flexDirection: "row", gap: 2 }, summaryMuted: { color: colors.shellMuted, fontSize: 12 }, summaryDivider: { alignSelf: "stretch", backgroundColor: colors.border, width: 1 }, summaryDividerCompact: { height: 1, width: "100%" }, stat: { flex: 1, gap: 4, minWidth: 76 }, statNumber: { color: colors.surface, fontSize: 26, fontWeight: "700" }, list: { gap: spacing.md }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, padding: spacing.lg }, cardHeader: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, productIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 42, justifyContent: "center", width: 42 }, productName: { color: colors.text, fontSize: 16, fontWeight: "700" }, date: { color: colors.muted, fontSize: 11, marginTop: 3 }, verified: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.pill, flexDirection: "row", gap: 4, paddingHorizontal: 9, paddingVertical: 6 }, verifiedText: { color: colors.success, fontSize: 10, fontWeight: "700" }, title: { color: colors.text, fontSize: 17, fontWeight: "700" }, body: { color: colors.muted, lineHeight: 22 }, bodyMuted: { color: colors.muted, fontStyle: "italic" }, productLink: { alignItems: "center", alignSelf: "flex-start", borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", gap: 6, minHeight: 44, paddingTop: spacing.md }, linkText: { color: colors.primary, fontWeight: "700" }, empty: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderStyle: "dashed", borderWidth: 1, gap: spacing.md, padding: 44 }, emptyTitle: { color: colors.text, fontSize: 22, fontWeight: "700" }, muted: { color: colors.muted, lineHeight: 20, textAlign: "center" }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 46, paddingHorizontal: spacing.lg }, primaryText: { color: colors.surface, fontWeight: "700" }
});
