import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { getMyDevices, revokeMyDevice } from "../auth/auth.api";
import { firebaseAuth } from "../auth/firebase";
import { AccountState } from "./components/AccountState";

export function DevicesScreen() {
  const router = useRouter();
  const user = firebaseAuth?.currentUser ?? null;
  const cache = useQueryClient();
  const devices = useQuery({ queryKey: ["me", "devices"], queryFn: () => getMyDevices(user!), enabled: Boolean(user) });
  const revoke = useMutation({ mutationFn: (id: string) => revokeMyDevice(user!, id), onSuccess: () => cache.invalidateQueries({ queryKey: ["me", "devices"] }) });
  if (!user) return <AccountState icon="phone-portrait-outline" title="Your trusted devices" copy="Sign in to review app installations connected to your account." action="Sign in" onPress={() => router.replace("/auth")} />;
  if (devices.isLoading) return <AccountState loading icon="phone-portrait-outline" title="Loading devices" copy="Checking registered app installations." />;
  if (devices.error) return <AccountState icon="alert-circle-outline" title="Could not load devices" copy={devices.error.message} action="Try again" onPress={() => devices.refetch()} />;
  return <Screen eyebrow="SECURITY" title="Your devices" description="Review app installations connected to your account and revoke access when needed.">{devices.isLoading ? <ActivityIndicator color={colors.primary} /> : null}{devices.error ? <Text style={styles.error}>{devices.error.message}</Text> : null}{devices.data?.length === 0 ? <ModuleCard title="No registered devices" meta="A device appears after push registration completes." /> : null}{devices.data?.map((device) => <ModuleCard key={device.id} title={device.platform.toUpperCase()} meta={device.revokedAt ? "REVOKED" : "ACTIVE"}><Text style={styles.muted}>App version: {device.appVersion || "Unknown"}</Text><Text style={styles.muted}>Registered {new Date(device.createdAt).toLocaleString()}</Text><Text selectable style={styles.installation}>Installation {device.installationId}</Text>{!device.revokedAt ? <Pressable disabled={revoke.isPending} onPress={() => revoke.mutate(device.id)} style={styles.revoke}><Text style={styles.revokeText}>{revoke.isPending ? "Revoking…" : "Revoke device"}</Text></Pressable> : <Text style={styles.revokedAt}>Revoked {new Date(device.revokedAt).toLocaleString()}</Text>}</ModuleCard>)}</Screen>;
}

const styles = StyleSheet.create({ muted: { color: colors.muted }, installation: { color: colors.muted, fontSize: 11 }, revoke: { alignItems: "center", borderColor: colors.danger, borderRadius: radius.md, borderWidth: 1, marginTop: spacing.sm, padding: spacing.sm }, revokeText: { color: colors.danger, fontWeight: "900" }, revokedAt: { color: colors.danger, fontSize: 12, marginTop: spacing.sm }, error: { color: colors.danger } });
