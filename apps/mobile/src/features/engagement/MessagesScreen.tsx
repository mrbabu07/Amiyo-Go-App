import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { firebaseAuth } from "../auth/firebase";
import { getThreads } from "./engagement.api";

export function MessagesScreen() { const router = useRouter(); const user = firebaseAuth?.currentUser; const query = useQuery({ queryKey: ["chat-threads"], queryFn: () => getThreads(user!), enabled: Boolean(user), refetchInterval: 15_000 }); return <Screen title="Messages" description="Secure customer and vendor conversations.">{query.isLoading ? <ActivityIndicator /> : null}{query.data?.length === 0 ? <Text>No conversations yet.</Text> : null}{query.data?.map((thread) => <Pressable accessibilityRole="button" key={thread.id} onPress={() => router.push(`/messages/${thread.id}` as never)}><ModuleCard title={thread.subject || "Conversation"} meta={`${thread.status} · ${new Date(thread.updatedAt).toLocaleString()}`}><Text>{thread.messages.at(-1)?.body || "No messages yet"}</Text></ModuleCard></Pressable>)}</Screen>; }
