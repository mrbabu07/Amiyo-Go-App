import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getAdminTickets, replyToTicket, updateTicketStatus } from "./support.api";

const statuses = ["open", "in_progress", "resolved", "closed"] as const;

export function AdminSupportScreen() {
  const user = useCurrentUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const tickets = useQuery({ queryKey: ["support", "admin", user?.uid], queryFn: () => getAdminTickets(user!), enabled: Boolean(user), retry: false });
  const update = useMutation({ retry: false, mutationFn: ({ id, status }: { id: string; status: (typeof statuses)[number] }) => updateTicketStatus(user!, id, { status }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support", "admin", user!.uid] }) });
  const reply = useMutation({ retry: false, mutationFn: ({ id, body }: { id: string; body: string }) => replyToTicket(user!, id, body), onSuccess: async (_, variables) => {
    setDrafts((current) => ({ ...current, [variables.id]: "" }));
    await queryClient.invalidateQueries({ queryKey: ["support", "admin", user!.uid] });
  } });
  return <Screen eyebrow="ADMIN QUEUE" title="Support operations" description="Review customer conversations and move tickets through resolution.">
    {tickets.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
    {tickets.error ? <Text style={styles.error}>{tickets.error.message}</Text> : null}
    <View style={styles.summary}><Text style={styles.summaryValue}>{tickets.data?.filter((item) => !["closed", "resolved"].includes(item.status)).length ?? 0}</Text><Text style={styles.summaryCopy}>tickets need attention</Text></View>
    {tickets.data?.map((ticket) => <ModuleCard key={ticket.id} title={ticket.subject} meta={`${ticket.category} · ${ticket.priority.toUpperCase()} · #${ticket.id.slice(0, 8)}`}>
      <Text style={styles.customer}>Customer {ticket.userId.slice(0, 8)}</Text>
      {ticket.orderId || ticket.returnId ? <View style={styles.context}><View style={styles.contextCopy}><Text style={styles.contextTitle}>Verified linked context</Text><Text style={styles.muted}>{ticket.returnId ? `Return ${ticket.returnId.slice(0, 8).toUpperCase()}` : "Order case"}</Text></View><View style={styles.contextActions}>{ticket.orderId ? <Pressable accessibilityRole="link" onPress={() => router.push(`/admin/orders/${ticket.orderId}` as never)} style={styles.contextButton}><Text style={styles.contextButtonText}>Open order</Text></Pressable> : null}{ticket.returnId ? <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: "/admin/returns", params: { returnId: ticket.returnId } } as never)} style={styles.contextButton}><Text style={styles.contextButtonText}>Open return</Text></Pressable> : null}</View></View> : null}
      {ticket.messages.map((message) => <View key={message.id} style={styles.message}><Text style={styles.sender}>{message.senderId === ticket.userId ? "Customer" : "Support"}</Text><Text style={styles.messageText}>{message.body}</Text>{message.attachments.map((file) => <Text key={file.storageKey} numberOfLines={1} style={styles.attachment}>Attachment · {file.name}</Text>)}<Text style={styles.muted}>{new Date(message.createdAt).toLocaleString()}</Text></View>)}
      {ticket.status !== "closed" ? <View style={styles.reply}><Text style={styles.contextTitle}>Reply to customer</Text><TextInput accessibilityLabel={`Reply to ticket ${ticket.id.slice(0, 8)}`} maxLength={3000} multiline onChangeText={(body) => setDrafts((current) => ({ ...current, [ticket.id]: body }))} placeholder="Write an operational update..." placeholderTextColor={colors.muted} style={styles.replyInput} value={drafts[ticket.id] ?? ""} />{reply.error && reply.variables?.id === ticket.id ? <Text accessibilityRole="alert" style={styles.error}>{reply.error.message}</Text> : null}<Pressable accessibilityRole="button" disabled={reply.isPending || !(drafts[ticket.id] ?? "").trim()} onPress={() => reply.mutate({ id: ticket.id, body: (drafts[ticket.id] ?? "").trim() })} style={[styles.send, (reply.isPending || !(drafts[ticket.id] ?? "").trim()) && styles.disabled]}>{reply.isPending && reply.variables?.id === ticket.id ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>Send reply</Text>}</Pressable></View> : null}
      <View style={styles.actions}>{statuses.map((status) => <Pressable key={status} disabled={update.isPending || status === ticket.status} onPress={() => update.mutate({ id: ticket.id, status })} style={[styles.chip, status === ticket.status && styles.active]}><Text style={[styles.chipText, status === ticket.status && styles.activeText]}>{status.replaceAll("_", " ")}</Text></Pressable>)}</View>
    </ModuleCard>)}
    {tickets.data?.length === 0 ? <ModuleCard title="Queue clear" meta="There are no support tickets to review." /> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  error: { color: colors.danger }, summary: { backgroundColor: colors.navy, borderRadius: radius.lg, padding: spacing.lg }, summaryValue: { color: "#fff", fontSize: 32, fontWeight: "700" }, summaryCopy: { color: colors.background, fontSize: 11 }, muted: { color: colors.muted, fontSize: 11 }, customer: { color: colors.primary, fontWeight: "600" },
  context: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.md, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between", padding: spacing.sm }, contextCopy: { flex: 1, minWidth: 150 }, contextTitle: { color: colors.text, fontSize: 12, fontWeight: "700" }, contextActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, contextButton: { alignItems: "center", borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.md }, contextButtonText: { color: colors.primary, fontSize: 11, fontWeight: "700" },
  message: { backgroundColor: colors.primarySoft, borderRadius: radius.md, gap: 5, padding: spacing.md }, sender: { color: colors.primary, fontSize: 10, fontWeight: "700", textTransform: "uppercase" }, messageText: { color: colors.text }, attachment: { color: colors.primary, fontSize: 11, fontWeight: "600" }, reply: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, gap: spacing.sm, padding: spacing.md }, replyInput: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 88, padding: spacing.md, textAlignVertical: "top" }, send: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 44, minWidth: 130, paddingHorizontal: spacing.md }, sendText: { color: "#fff", fontWeight: "700" }, disabled: { opacity: .5 }, actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, chip: { borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 }, active: { backgroundColor: colors.primary, borderColor: colors.primary }, chipText: { color: colors.text, fontSize: 10, fontWeight: "600" }, activeText: { color: "#fff" }
});
