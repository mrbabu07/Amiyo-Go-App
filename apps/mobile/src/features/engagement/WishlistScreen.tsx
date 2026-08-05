import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { firebaseAuth } from "../auth/firebase";
import { getWishlist, removeWishlistItem, shareWishlist } from "./engagement.api";

const money = (minor: string) => `৳${(Number(minor) / 100).toLocaleString("en-BD")}`;

export function WishlistScreen() { const router = useRouter(); const cache = useQueryClient(); const user = firebaseAuth?.currentUser; const query = useQuery({ queryKey: ["wishlist"], queryFn: () => getWishlist(user!), enabled: Boolean(user) }); const refresh = async (action: () => Promise<unknown>) => { await action(); await cache.invalidateQueries({ queryKey: ["wishlist"] }); }; return <Screen title="My wishlist" description="Saved products stay synced across mobile and web.">{query.isLoading ? <ActivityIndicator /> : null}{query.data ? <><Pressable accessibilityRole="button" onPress={() => refresh(() => shareWishlist(user!))}><Text>Generate 30-day share link →</Text></Pressable>{query.data.shareUrl ? <Text selectable>{query.data.shareUrl}</Text> : null}{query.data.items.map((item) => <ModuleCard key={item.productId} title={item.name} meta={item.price ? money(item.price.amountMinor) : "Unavailable"}><Pressable accessibilityRole="link" onPress={() => router.push(`/product/${item.slug}` as never)}><Text>View product →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => refresh(() => removeWishlistItem(user!, item.productId))}><Text>Remove</Text></Pressable></ModuleCard>)}</> : null}</Screen>; }
