import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { getMyReviews } from "./engagement.api";

export function MyReviewsScreen() {
  const router = useRouter();
  const user = firebaseAuth?.currentUser ?? null;
  const reviews = useQuery({ queryKey: ["reviews", "mine"], queryFn: () => getMyReviews(user!), enabled: Boolean(user) });
  const average = reviews.data?.length ? reviews.data.reduce((sum, item) => sum + item.rating, 0) / reviews.data.length : 0;
  return <Screen eyebrow="YOUR VOICE" title="My reviews" description="See the verified feedback you shared with the Amiyo-Go community."><View style={styles.summary}><Text style={styles.score}>{average.toFixed(1)}</Text><Text style={styles.stars}>{"★".repeat(Math.round(average))}{"☆".repeat(5 - Math.round(average))}</Text><Text style={styles.muted}>{reviews.data?.length ?? 0} published reviews</Text></View>{reviews.isLoading ? <ActivityIndicator color={colors.primary} /> : null}{reviews.error ? <Text style={styles.error}>{reviews.error.message}</Text> : null}{reviews.data?.map((review) => <ModuleCard key={review.id} title={review.productName || "Reviewed product"} meta={`${new Date(review.createdAt).toLocaleDateString()} · Verified purchase`}><Text style={styles.stars}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</Text>{review.title ? <Text style={styles.title}>{review.title}</Text> : null}{review.body ? <Text style={styles.body}>{review.body}</Text> : null}<Pressable onPress={() => router.push(`/product/${review.productSlug || review.productId}` as never)}><Text style={styles.link}>View product →</Text></Pressable></ModuleCard>)}{reviews.data?.length === 0 ? <ModuleCard title="No reviews yet" meta="After a delivered order, share your experience from the product page." /> : null}</Screen>;
}
const styles = StyleSheet.create({ summary: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, padding: spacing.lg }, score: { color: "#fff", fontSize: 42, fontWeight: "900" }, stars: { color: colors.accent, fontSize: 20, letterSpacing: 2 }, muted: { color: "#cbd5e1" }, error: { color: colors.danger }, title: { color: colors.text, fontWeight: "900" }, body: { color: colors.muted, lineHeight: 21 }, link: { color: colors.primary, fontWeight: "900" } });
