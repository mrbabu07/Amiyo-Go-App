import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getAdminChat, readAdminChat, sendAdminChatMessage } from "./admin.api";

export function AdminChatDetailScreen({ threadId }: { threadId?: string }) {
  const compact = useWindowDimensions().width < 620;
  const user = useCurrentUser();
  const router = useRouter();
  const cache = useQueryClient();
  const [body, setBody] = useState("");
  const detailKey = ["admin", "chat", user?.uid, threadId] as const;
  const listKey = ["admin", "chats", user?.uid] as const;
  const query = useQuery({ queryKey: detailKey, queryFn: () => getAdminChat(user!, threadId!), enabled: Boolean(user && threadId), refetchInterval: 10_000, retry: false });
  const markRead = useMutation({ retry: false, mutationFn: () => readAdminChat(user!, threadId!), onSuccess: (data) => { cache.setQueryData(detailKey, data); void cache.invalidateQueries({ queryKey: listKey }); } });
  useEffect(() => { if (user && threadId && query.data && !markRead.isSuccess && !markRead.isPending) markRead.mutate(); }, [user, threadId, query.data, markRead.isPending, markRead.isSuccess]);
  const send = useMutation({ retry: false, mutationFn: () => sendAdminChatMessage(user!, threadId!, body.trim()), onSuccess: (data) => { setBody(""); cache.setQueryData(detailKey, data); void cache.invalidateQueries({ queryKey: listKey }); } });
  if (query.isLoading) return <Screen title="Vendor conversation"><ActivityIndicator color={colors.primary} /></Screen>;
  const thread = query.data;
  return <Screen eyebrow="SELLER SUPPORT" title={thread?.vendorName || "Vendor conversation"} description={`${thread?.subject || "Seller support"} · ${thread?.status || "open"}`}>
    <View style={styles.header}><Pressable accessibilityRole="link" onPress={() => router.replace("/admin/chats")} style={styles.secondary}><Text style={styles.secondaryText}>← Inbox</Text></Pressable>{thread?.vendorId ? <Pressable accessibilityRole="link" onPress={() => router.push(`/admin/vendors/${thread.vendorId}`)} style={styles.secondary}><Text style={styles.secondaryText}>View vendor</Text></Pressable> : null}</View>
    {query.error || send.error || markRead.error ? <Text accessibilityRole="alert" style={styles.error}>{(query.error || send.error || markRead.error)?.message}</Text> : null}
    <ScrollView contentContainerStyle={styles.messages}>{thread?.messages.map((message) => { const mine = message.senderId === user?.uid || message.senderRole === "admin"; return <View key={message.id} style={[styles.messageRow, mine && styles.mineRow]}><View style={[styles.bubble, mine && styles.mineBubble]}><Text style={[styles.sender, mine && styles.mineText]}>{mine ? "You (Admin)" : message.senderName}</Text><Text style={[styles.body, mine && styles.mineText]}>{message.body}</Text><Text style={[styles.time, mine && styles.mineTime]}>{new Date(message.createdAt).toLocaleString()}</Text></View></View>; })}{!thread?.messages.length ? <Text style={styles.empty}>No messages yet. Start the conversation with this seller.</Text> : null}</ScrollView>
    <View style={[styles.composer, compact && { alignItems: "stretch", flexDirection: "column" }]}><TextInput accessibilityLabel="Message to seller" value={body} onChangeText={setBody} multiline placeholder="Write a message to this seller..." placeholderTextColor={colors.muted} style={[styles.input, compact && { minWidth: 0, width: "100%" }]} /><Pressable accessibilityRole="button" disabled={!user || !threadId || !body.trim() || send.isPending} onPress={() => send.mutate()} style={[styles.send, compact && { alignItems: "center", minHeight: 44, width: "100%" }, (!user || !threadId || !body.trim() || send.isPending) && styles.disabled]}><Text style={styles.sendText}>{send.isPending ? "Sending..." : "Send message"}</Text></Pressable></View>
  </Screen>;
}

const styles = StyleSheet.create({ header: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, secondary: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 9 }, secondaryText: { color: colors.text, fontSize: 11, fontWeight: "700" }, messages: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, minHeight: 360, padding: spacing.md }, messageRow: { alignItems: "flex-start" }, mineRow: { alignItems: "flex-end" }, bubble: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, maxWidth: 560, padding: spacing.md, width: "85%" }, mineBubble: { backgroundColor: colors.primary, borderColor: colors.primary }, sender: { color: colors.primary, fontSize: 10, fontWeight: "700", marginBottom: spacing.xs }, body: { color: colors.text, fontSize: 14, lineHeight: 21 }, time: { color: colors.muted, fontSize: 9, marginTop: spacing.sm }, mineText: { color: colors.surface }, mineTime: { color: colors.primarySoft }, composer: { alignItems: "flex-end", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, padding: spacing.md }, input: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, flex: 1, minHeight: 78, minWidth: 220, padding: 12, textAlignVertical: "top" }, send: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 13 }, sendText: { color: colors.surface, fontWeight: "700" }, disabled: { opacity: .45 }, error: { color: colors.danger }, empty: { color: colors.muted, padding: spacing.xl, textAlign: "center" } });
