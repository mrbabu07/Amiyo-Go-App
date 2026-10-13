import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "firebase/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { cancelAccountDeletion, getDeletionRequest, requestAccountDeletion } from "../auth/auth.api";
import { useCurrentUser } from "../auth/use-current-user";
import { AccountState } from "./components/AccountState";

export function AccountDeletionScreen() {
  const router = useRouter(); const user = useCurrentUser(); const queryClient = useQueryClient(); const [reason, setReason] = useState("");
  const request = useQuery({ queryKey: ["me", "deletion", user?.uid], queryFn: () => getDeletionRequest(user!), enabled: Boolean(user), retry: false });
  const refresh = (owner: User) => queryClient.invalidateQueries({ queryKey: ["me", "deletion", owner.uid] });
  const submit = useMutation({ retry: false, mutationFn: (owner: User) => requestAccountDeletion(owner, { reason: reason.trim() || null }), onSuccess: (_data, owner) => refresh(owner) });
  const cancel = useMutation({ retry: false, mutationFn: (owner: User) => cancelAccountDeletion(owner), onSuccess: (_data, owner) => refresh(owner) });
  if (!user) return <AccountState icon="shield-outline" title="Account deletion" copy="Sign in to manage deletion and recovery requests." action="Sign in" onPress={() => router.replace("/auth")} />;
  if (request.isLoading) return <AccountState loading icon="shield-outline" title="Checking account status" copy="Looking for an active deletion request." />;
  if (request.error) return <AccountState icon="alert-circle-outline" title="Could not load deletion status" copy={request.error.message} action="Try again" onPress={() => request.refetch()} />;
  return <Screen eyebrow="PRIVACY" title="Delete account" description="Request account anonymization with a 30-day recovery window.">{request.data ? <ModuleCard title="Deletion scheduled" meta={`Requested ${new Date(request.data.requestedAt).toLocaleDateString()}`}><Text style={styles.warning}>Your account is scheduled for processing after {new Date(request.data.executeAfter).toLocaleDateString()}.</Text><Text style={styles.muted}>Order, payment, tax, fraud, and audit records may be retained where legally required.</Text><Pressable disabled={cancel.isPending} onPress={() => cancel.mutate(user)} style={styles.recover}>{cancel.isPending ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.recoverText}>Keep my account</Text>}</Pressable>{cancel.error ? <Text accessibilityRole="alert" style={styles.error}>{cancel.error.message}</Text> : null}</ModuleCard> : <ModuleCard title="Before you continue" meta="This affects customer and vendor access tied to this identity."><Text style={styles.muted}>Your active request enters a recovery period before the retention worker anonymizes eligible personal data.</Text><TextInput multiline onChangeText={setReason} placeholder="Optional reason" placeholderTextColor={colors.muted} style={styles.input} value={reason} /><Pressable disabled={submit.isPending} onPress={() => submit.mutate(user)} style={styles.danger}>{submit.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Request account deletion</Text>}</Pressable>{submit.error ? <Text accessibilityRole="alert" style={styles.error}>{submit.error.message}</Text> : null}</ModuleCard>}</Screen>;
}

const styles = StyleSheet.create({ muted: { color: colors.muted, lineHeight: 21 }, warning: { color: colors.warning, fontWeight: "700", lineHeight: 21 }, input: { backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 100, padding: spacing.md, textAlignVertical: "top" }, danger: { alignItems: "center", backgroundColor: colors.danger, borderRadius: radius.md, justifyContent: "center", minHeight: 46 }, recover: { alignItems: "center", borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, justifyContent: "center", minHeight: 46 }, recoverText: { color: colors.primary, fontWeight: "700" }, buttonText: { color: "#fff", fontWeight: "700" }, error: { color: colors.danger } });
