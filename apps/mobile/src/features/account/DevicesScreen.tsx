import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@firebase/auth";
import { useRouter } from "expo-router";
import { useRef } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { getMyDevices, revokeMyDevice } from "../auth/auth.api";
import { useCurrentUser } from "../auth/use-current-user";
import { AccountState } from "./components/AccountState";

export function DevicesScreen() {
  const router = useRouter();
  const user = useCurrentUser();
  const compact = useWindowDimensions().width < 620;
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;
  const cache = useQueryClient();
  const devices = useQuery({ queryKey: ["me", "devices", user?.uid], queryFn: () => getMyDevices(user!), enabled: Boolean(user), retry: false });
  const revoke = useMutation({
    retry: false,
    mutationFn: ({ owner, id }: { owner: User; id: string }) => revokeMyDevice(owner, id),
    onSuccess: async (_data, variables) => {
      if (activeUid.current === variables.owner.uid) await cache.invalidateQueries({ queryKey: ["me", "devices", variables.owner.uid] });
    }
  });

  if (!user) return <AccountState icon="phone-portrait-outline" title="Your trusted devices" copy="Sign in to review app installations connected to your account." action="Sign in" onPress={() => router.replace("/auth")} />;
  if (devices.isLoading) return <AccountState loading icon="phone-portrait-outline" title="Loading devices" copy="Checking registered app installations." />;
  if (devices.error) return <AccountState icon="alert-circle-outline" title="Could not load devices" copy={devices.error.message} action="Try again" onPress={() => devices.refetch()} />;

  const activeCount = devices.data?.filter((device) => !device.revokedAt).length ?? 0;
  return <Screen eyebrow="SECURITY" title="Your devices" description="Review app installations connected to your account and revoke access when needed.">
    <View style={[styles.hero, compact && styles.heroCompact]}><View style={styles.heroIcon}><Ionicons color={colors.surface} name="shield-checkmark" size={26} /></View><View style={styles.flex}><Text style={styles.heroTitle}>{activeCount} active device{activeCount === 1 ? "" : "s"}</Text><Text style={styles.heroCopy}>Only devices registered for this signed-in account appear here.</Text></View></View>
    {devices.data?.length === 0 ? <ModuleCard title="No registered devices" meta="A device appears after push registration completes." /> : null}
    <View style={styles.list}>{devices.data?.map((device) => <View key={device.id} style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.cardHeader}><View style={styles.deviceIcon}><Ionicons color={colors.primary} name={device.platform.toLowerCase().includes("web") ? "globe-outline" : "phone-portrait-outline"} size={22} /></View><View style={styles.flex}><Text style={styles.deviceTitle}>{device.platform.toUpperCase()}</Text><Text style={[styles.state, device.revokedAt && styles.stateRevoked]}>{device.revokedAt ? "REVOKED" : "ACTIVE"}</Text></View></View>
      <Text style={styles.muted}>App version: {device.appVersion || "Unknown"}</Text>
      <Text style={styles.muted}>Registered {new Date(device.createdAt).toLocaleString("en-BD")}</Text>
      <Text numberOfLines={compact ? 2 : 1} selectable style={styles.installation}>Installation {device.installationId}</Text>
      {!device.revokedAt ? <Pressable disabled={revoke.isPending} onPress={() => revoke.mutate({ owner: user, id: device.id })} style={[styles.revoke, compact && styles.revokeCompact]}><Text style={styles.revokeText}>{revoke.isPending ? "Revoking…" : "Revoke device"}</Text></Pressable> : <Text style={styles.revokedAt}>Revoked {new Date(device.revokedAt).toLocaleString("en-BD")}</Text>}
    </View>)}</View>
    {revoke.error ? <Text accessibilityRole="alert" style={styles.error}>{revoke.error.message}</Text> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, hero: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.lg, flexDirection: "row", gap: spacing.md, padding: spacing.lg }, heroCompact: { alignItems: "flex-start", padding: spacing.md }, heroIcon: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, height: 50, justifyContent: "center", width: 50 }, heroTitle: { color: colors.surface, fontSize: 19, fontWeight: "700" }, heroCopy: { color: colors.border, lineHeight: 18, marginTop: 3 }, list: { gap: spacing.md }, card: { backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.sm, padding: spacing.lg }, cardCompact: { padding: spacing.md }, cardHeader: { alignItems: "center", flexDirection: "row", gap: spacing.sm }, deviceIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 44, justifyContent: "center", width: 44 }, deviceTitle: { color: colors.text, fontSize: 16, fontWeight: "700" }, state: { color: colors.success, fontSize: 9, fontWeight: "700", marginTop: 2 }, stateRevoked: { color: colors.danger }, muted: { color: colors.muted, lineHeight: 19 }, installation: { color: colors.muted, fontSize: 11, lineHeight: 17 }, revoke: { alignItems: "center", alignSelf: "flex-start", borderColor: colors.danger, borderRadius: radius.md, borderWidth: 1, marginTop: spacing.sm, minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.lg }, revokeCompact: { alignSelf: "stretch" }, revokeText: { color: colors.danger, fontWeight: "700" }, revokedAt: { color: colors.danger, fontSize: 12, marginTop: spacing.sm }, error: { color: colors.danger }
});
