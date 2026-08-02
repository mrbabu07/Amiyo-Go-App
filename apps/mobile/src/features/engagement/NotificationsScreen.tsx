import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { firebaseAuth } from "../auth/firebase";
import { getNotifications, readNotification } from "./engagement.api";

export function NotificationsScreen() { const router = useRouter(); const cache = useQueryClient(); const user = firebaseAuth?.currentUser; const query = useQuery({ queryKey: ["notifications"], queryFn: () => getNotifications(user!), enabled: Boolean(user), refetchInterval: 30_000 }); async function open(id: string, href: string | null) { await readNotification(user!, id); await cache.invalidateQueries({ queryKey: ["notifications"] }); if (href) router.push(href as never); } return <Screen title="Notifications" description="Order, Q&A, chat, stock, and campaign updates.">{query.isLoading ? <ActivityIndicator /> : null}{query.data?.length === 0 ? <Text>No notifications yet.</Text> : null}{query.data?.map((item) => <Pressable accessibilityRole="button" key={item.id} onPress={() => open(item.id, item.href)}><ModuleCard title={item.title} meta={`${item.readAt ? "Read" : "New"} · ${new Date(item.createdAt).toLocaleString()}`}><Text>{item.body}</Text></ModuleCard></Pressable>)}</Screen>; }
