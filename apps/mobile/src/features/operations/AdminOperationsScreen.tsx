import { randomUUID } from "expo-crypto";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { getAdminQueues, getDeliveryQueue, retryDelivery } from "./operations.api";

export function AdminOperationsScreen() {
  const user = firebaseAuth?.currentUser;
  const queryClient = useQueryClient();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const queues = useQuery({ queryKey: ["admin-operations"], queryFn: () => getAdminQueues(user!), enabled: Boolean(user) });
  const delivery = useQuery({ queryKey: ["admin-delivery-queue"], queryFn: () => getDeliveryQueue(user!), enabled: Boolean(user), refetchInterval: 15_000 });
  const retry = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => retryDelivery(user!, id, { reason }, randomUUID()),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["admin-delivery-queue"] })
  });

  const loading = queues.isLoading || delivery.isLoading;
  const error = queues.error || delivery.error || retry.error;

  return (
    <Screen title="Operations queues" description="Returns, payouts, delivery exceptions, and audit activity in one mobile view.">
      {loading ? <ActivityIndicator accessibilityLabel="Loading operations queues" color={colors.primary} /> : null}
      {error ? <View accessibilityRole="alert"><Text style={styles.error}>{error instanceof Error ? error.message : "Could not load queues"}</Text><Pressable accessibilityRole="button" onPress={() => Promise.all([queues.refetch(), delivery.refetch()])} style={styles.secondary}><Text style={styles.secondaryText}>Retry loading</Text></Pressable></View> : null}
      <ModuleCard title={`Delivery queue · ${delivery.data?.length ?? 0}`} meta="Pending dispatches and failures requiring operations review">
        {delivery.data?.length === 0 ? <Text style={styles.muted}>No pending or failed delivery dispatches.</Text> : null}
        {delivery.data?.map((item) => {
          const reason = reasons[item.id] ?? "";
          const busy = retry.isPending && retry.variables?.id === item.id;
          return (
            <View key={item.id} style={styles.dispatch}>
              <View style={styles.row}><Text accessibilityRole="header" style={styles.dispatchTitle}>{item.orderNumber}</Text><Text style={[styles.badge, item.status === "FAILED" ? styles.failed : styles.pending]}>{item.status}</Text></View>
              <Text style={styles.muted}>Attempts: {item.attempts} · Updated {new Date(item.updatedAt).toLocaleString()}</Text>
              <Text selectable style={styles.key}>{item.dispatchKey}</Text>
              {item.lastError ? <Text accessibilityRole="alert" style={styles.error}>{item.lastError}</Text> : null}
              {item.status === "FAILED" ? <><TextInput accessibilityLabel={`Retry reason for ${item.orderNumber}`} editable={!busy} maxLength={300} multiline onChangeText={(value) => setReasons((current) => ({ ...current, [item.id]: value }))} placeholder="Reason for retry" placeholderTextColor={colors.muted} style={styles.input} value={reason} /><Pressable accessibilityRole="button" disabled={busy || reason.trim().length < 3} onPress={() => retry.mutate({ id: item.id, reason: reason.trim() })} style={[styles.primary, (busy || reason.trim().length < 3) && styles.disabled]}><Text style={styles.primaryText}>{busy ? "Retrying…" : "Retry delivery"}</Text></Pressable></> : null}
            </View>
          );
        })}
      </ModuleCard>
      {queues.data ? <><ModuleCard title={`Returns · ${queues.data.returns.length}`}>{queues.data.returns.slice(0, 8).map((item) => <Text key={item.id}>{item.status.replaceAll("_", " ")} · {item.reasonCode}</Text>)}</ModuleCard><ModuleCard title={`Payouts · ${queues.data.payouts.length}`}>{queues.data.payouts.slice(0, 8).map((item) => <Text key={item.id}>{item.status} · {item.vendor.legalName}</Text>)}</ModuleCard><ModuleCard title={`Audit activity · ${queues.data.audit.length}`}>{queues.data.audit.slice(0, 8).map((item) => <Text key={item.id}>{item.action} · {item.resourceType}</Text>)}</ModuleCard></> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: radius.pill, color: "#fff", fontSize: 12, fontWeight: "800", overflow: "hidden", paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  disabled: { opacity: 0.45 },
  dispatch: { borderTopColor: colors.border, borderTopWidth: 1, gap: spacing.sm, paddingTop: spacing.md },
  dispatchTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  error: { color: colors.danger, lineHeight: 20 },
  failed: { backgroundColor: colors.danger },
  input: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 72, padding: spacing.sm, textAlignVertical: "top" },
  key: { color: colors.muted, fontFamily: "monospace", fontSize: 12 },
  muted: { color: colors.muted, lineHeight: 20 },
  pending: { backgroundColor: colors.warning },
  primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.sm },
  primaryText: { color: "#fff", fontWeight: "800" },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  secondary: { alignItems: "center", borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, marginTop: spacing.sm, padding: spacing.sm },
  secondaryText: { color: colors.primary, fontWeight: "800" }
});
