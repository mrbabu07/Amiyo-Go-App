import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { getAdminTickets, updateTicketStatus } from "./support.api";

const statuses = ["open", "in_progress", "resolved", "closed"] as const;
export function AdminSupportScreen() {
  const user = firebaseAuth?.currentUser ?? null;
  const queryClient = useQueryClient();
  const tickets = useQuery({ queryKey: ["support", "admin"], queryFn: () => getAdminTickets(user!), enabled: Boolean(user) });
  const update = useMutation({ mutationFn: ({ id, status }: { id: string; status: (typeof statuses)[number] }) => updateTicketStatus(user!, id, { status }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support", "admin"] }) });
  return <Screen eyebrow="ADMIN QUEUE" title="Support operations" description="Review customer conversations and move tickets through resolution.">{tickets.isLoading ? <ActivityIndicator color={colors.primary} /> : null}{tickets.error ? <Text style={styles.error}>{tickets.error.message}</Text> : null}<View style={styles.summary}><Text style={styles.summaryValue}>{tickets.data?.filter((item) => !["closed", "resolved"].includes(item.status)).length ?? 0}</Text><Text style={styles.muted}>tickets need attention</Text></View>{tickets.data?.map((ticket) => <ModuleCard key={ticket.id} title={ticket.subject} meta={`${ticket.category} · ${ticket.priority.toUpperCase()} · #${ticket.id.slice(0, 8)}`}><Text style={styles.customer}>Customer {ticket.userId.slice(0, 8)}</Text>{ticket.messages.map((message) => <View key={message.id} style={styles.message}><Text>{message.body}</Text><Text style={styles.muted}>{new Date(message.createdAt).toLocaleString()}</Text></View>)}<View style={styles.actions}>{statuses.map((status) => <Pressable key={status} disabled={update.isPending || status === ticket.status} onPress={() => update.mutate({ id: ticket.id, status })} style={[styles.chip, status === ticket.status && styles.active]}><Text style={[styles.chipText, status === ticket.status && styles.activeText]}>{status.replaceAll("_", " ")}</Text></Pressable>)}</View></ModuleCard>)}{tickets.data?.length === 0 ? <ModuleCard title="Queue clear" meta="There are no support tickets to review." /> : null}</Screen>;
}
const styles = StyleSheet.create({ error: { color: colors.danger }, summary: { backgroundColor: colors.navy, borderRadius: radius.lg, padding: spacing.lg }, summaryValue: { color: "#fff", fontSize: 32, fontWeight: "700" }, muted: { color: colors.muted, fontSize: 11 }, customer: { color: colors.primary, fontWeight: "600" }, message: { backgroundColor: "#f8fafc", borderRadius: radius.md, gap: 5, padding: spacing.md }, actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, chip: { borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 }, active: { backgroundColor: colors.primary, borderColor: colors.primary }, chipText: { color: colors.text, fontSize: 10, fontWeight: "600" }, activeText: { color: "#fff" } });
