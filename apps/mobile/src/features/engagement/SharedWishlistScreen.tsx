import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { getSharedWishlist } from "./engagement.api";

const money = (minor: string) => `৳${(Number(minor) / 100).toLocaleString("en-BD")}`;

export function SharedWishlistScreen({ token }: { token: string }) {
  const router = useRouter();
  const query = useQuery({ queryKey: ["wishlist", "shared", token], queryFn: () => getSharedWishlist(token), enabled: Boolean(token) });
  return <Screen eyebrow="SHARED COLLECTION" title={query.data?.name || "Shared wishlist"} description="Browse products shared through a time-limited Amiyo-Go link.">{query.isLoading ? <ActivityIndicator color={colors.primary} size="large" /> : null}{query.error ? <View style={styles.state}><Ionicons color={colors.danger} name="link-outline" size={38} /><Text style={styles.error}>{query.error.message}</Text><Pressable onPress={() => router.replace("/")} style={styles.primary}><Text style={styles.primaryText}>Browse Amiyo-Go</Text></Pressable></View> : null}{query.data?.items.map((item) => <ModuleCard key={item.productId} title={item.name} meta={item.price ? money(item.price.amountMinor) : "Currently unavailable"}><Pressable accessibilityRole="link" onPress={() => router.push(`/product/${item.slug}` as never)} style={styles.primary}><Text style={styles.primaryText}>View product</Text></Pressable></ModuleCard>)}{query.data?.items.length === 0 ? <ModuleCard title="This wishlist is empty" meta="The owner has not saved any products yet." /> : null}</Screen>;
}

const styles = StyleSheet.create({ state: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, gap: spacing.md, padding: spacing.xl }, error: { color: colors.danger, fontWeight: "800", textAlign: "center" }, primary: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 42, paddingHorizontal: spacing.md }, primaryText: { color: "#fff", fontWeight: "900" } });
