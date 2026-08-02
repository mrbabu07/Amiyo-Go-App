import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { firebaseAuth } from "../auth/firebase";
import { getThreads, sendMessage } from "./engagement.api";

export function ChatThreadScreen({ id }: { id: string }) { const cache = useQueryClient(); const user = firebaseAuth?.currentUser; const [body, setBody] = useState(""); const query = useQuery({ queryKey: ["chat-threads"], queryFn: () => getThreads(user!), enabled: Boolean(user), refetchInterval: 10_000 }); const thread = query.data?.find((item) => item.id === id); async function send() { if (!user || !body.trim()) return; await sendMessage(user, id, body.trim()); setBody(""); await cache.invalidateQueries({ queryKey: ["chat-threads"] }); } return <Screen title={thread?.subject || "Conversation"} description="Messages are visible only to thread participants.">{query.isLoading ? <ActivityIndicator /> : null}{thread?.messages.map((message) => <ModuleCard key={message.id} title="Message" meta={new Date(message.createdAt).toLocaleString()}><Text>{message.body}</Text></ModuleCard>)}<TextInput accessibilityLabel="Message" onChangeText={setBody} placeholder="Write a message" value={body} /><Pressable accessibilityRole="button" onPress={send}><Text>Send message →</Text></Pressable></Screen>; }
