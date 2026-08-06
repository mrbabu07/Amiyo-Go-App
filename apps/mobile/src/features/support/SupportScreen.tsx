import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupportTicket } from "@amiyo/contracts";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { createTicket, getMyTickets, replyToTicket } from "./support.api";

const categories = ["ORDER", "DELIVERY", "PAYMENT", "RETURN", "ACCOUNT", "PRODUCT", "OTHER"] as const;

export function SupportScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = firebaseAuth?.currentUser ?? null;
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("ORDER");
  const [reply, setReply] = useState<Record<string, string>>({});
  const tickets = useQuery({ queryKey: ["support", "mine"], queryFn: () => user ? getMyTickets(user) : Promise.resolve([]), enabled: Boolean(user) });
  const create = useMutation({ mutationFn: () => createTicket(user!, { subject, message, category, priority: "normal" }), onSuccess: async (ticket) => { setSubject(""); setMessage(""); await queryClient.invalidateQueries({ queryKey: ["support", "mine"] }); router.push(`/support/${ticket.id}` as never); } });
  const sendReply = useMutation({ mutationFn: ({ id, body }: { id: string; body: string }) => replyToTicket(user!, id, body), onSuccess: async (_data, variables) => { setReply((value) => ({ ...value, [variables.id]: "" })); await queryClient.invalidateQueries({ queryKey: ["support", "mine"] }); } });

  if (!user) return <Screen title="Customer support" description="Sign in to create and track support requests."><Pressable onPress={() => router.push("/auth")} style={styles.primary}><Text style={styles.primaryText}>Sign in</Text></Pressable></Screen>;
  return <Screen eyebrow="HELP CENTER" title="How can we help?" description="Create a ticket and keep the full conversation in one place.">
    <View style={styles.stats}><Stat label="Open" value={tickets.data?.filter((item) => item.status === "open" || item.status === "in_progress").length ?? 0} /><Stat label="Resolved" value={tickets.data?.filter((item) => item.status === "resolved" || item.status === "closed").length ?? 0} /></View>
    <ModuleCard title="Create support ticket" meta="Our support team will reply in this thread.">
      <View style={styles.categories}>{categories.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.chip, category === item && styles.chipActive]}><Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text></Pressable>)}</View>
      <TextInput onChangeText={setSubject} placeholder="What do you need help with?" placeholderTextColor={colors.muted} style={styles.input} value={subject} />
      <TextInput multiline onChangeText={setMessage} placeholder="Describe the issue in detail" placeholderTextColor={colors.muted} style={[styles.input, styles.textarea]} value={message} />
      {create.error ? <Text style={styles.error}>{create.error.message}</Text> : null}
      <Pressable disabled={create.isPending || subject.trim().length < 3 || message.trim().length < 5} onPress={() => create.mutate()} style={[styles.primary, create.isPending && styles.disabled]}>{create.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Submit ticket</Text>}</Pressable>
    </ModuleCard>
    <Text style={styles.heading}>My tickets</Text>
    {tickets.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
    {tickets.data?.map((ticket) => <View key={ticket.id}><TicketCard ticket={ticket} reply={reply[ticket.id] ?? ""} setReply={(body) => setReply((value) => ({ ...value, [ticket.id]: body }))} send={() => sendReply.mutate({ id: ticket.id, body: reply[ticket.id] ?? "" })} busy={sendReply.isPending} /><Pressable onPress={() => router.push(`/support/${ticket.id}` as never)} style={styles.primary}><Text style={styles.primaryText}>Open full conversation</Text></Pressable></View>)}
    {tickets.data?.length === 0 ? <ModuleCard title="No support tickets" meta="Your new requests and replies will appear here." /> : null}
  </Screen>;
}

function TicketCard({ ticket, reply, setReply, send, busy }: { ticket: SupportTicket; reply: string; setReply(body: string): void; send(): void; busy: boolean }) {
  return <ModuleCard title={ticket.subject} meta={`${ticket.category} · ${new Date(ticket.updatedAt).toLocaleString()}`}><View style={styles.statusRow}><Text style={styles.status}>{ticket.status.replaceAll("_", " ").toUpperCase()}</Text><Text style={styles.ticketId}>#{ticket.id.slice(0, 8)}</Text></View>{ticket.messages.map((item) => <View key={item.id} style={styles.message}><Text style={styles.messageBody}>{item.body}</Text><Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text></View>)}{ticket.status !== "closed" ? <View style={styles.reply}><TextInput onChangeText={setReply} placeholder="Write a reply" placeholderTextColor={colors.muted} style={[styles.input, styles.replyInput]} value={reply} /><Pressable disabled={busy || !reply.trim()} onPress={send} style={styles.replyButton}><Text style={styles.primaryText}>Send</Text></Pressable></View> : null}</ModuleCard>;
}
function Stat({ label, value }: { label: string; value: number }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.date}>{label}</Text></View>; }

const styles = StyleSheet.create({ stats: { flexDirection: "row", gap: spacing.md }, stat: { backgroundColor: colors.primarySoft, borderRadius: radius.lg, flex: 1, padding: spacing.md }, statValue: { color: colors.primary, fontSize: 26, fontWeight: "900" }, categories: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, chip: { borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 }, chipActive: { backgroundColor: colors.primary, borderColor: colors.primary }, chipText: { color: colors.muted, fontSize: 11, fontWeight: "800" }, chipTextActive: { color: "#fff" }, input: { backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 46, paddingHorizontal: 13, paddingVertical: 10 }, textarea: { minHeight: 110, textAlignVertical: "top" }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 46, paddingHorizontal: spacing.lg }, primaryText: { color: "#fff", fontWeight: "900" }, disabled: { opacity: .55 }, error: { color: colors.danger }, heading: { color: colors.text, fontSize: 22, fontWeight: "900" }, statusRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, status: { backgroundColor: colors.accentSoft, borderRadius: radius.pill, color: colors.accent, fontSize: 10, fontWeight: "900", paddingHorizontal: 9, paddingVertical: 5 }, ticketId: { color: colors.muted, fontSize: 11 }, message: { backgroundColor: "#f8fafc", borderRadius: radius.md, gap: 4, padding: spacing.md }, messageBody: { color: colors.text, lineHeight: 21 }, date: { color: colors.muted, fontSize: 11 }, reply: { flexDirection: "row", gap: spacing.sm }, replyInput: { flex: 1 }, replyButton: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.md, justifyContent: "center", paddingHorizontal: spacing.md } });
