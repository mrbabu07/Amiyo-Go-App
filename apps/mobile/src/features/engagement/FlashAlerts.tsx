import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getFlashAlerts, removeFlashAlert, saveFlashAlert } from "./engagement.api";

function useFlashAlerts() {
  const user = useCurrentUser();
  const activeUid = useRef(user?.uid); activeUid.current = user?.uid;
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ["flash-alerts", user?.uid ?? null], queryFn: () => getFlashAlerts(user!), enabled: Boolean(user), staleTime: 30_000 });
  const mutation = useMutation({ retry: false, mutationFn: async ({ productId, enabled }: { productId: string; enabled: boolean }) => {
    if (!user || activeUid.current !== user.uid) throw new Error("Sign in to manage flash alerts");
    const data = enabled ? await saveFlashAlert(user, productId) : await removeFlashAlert(user, productId);
    return { data, uid: user.uid };
  }, onSuccess: ({ data, uid }) => {
    if (activeUid.current !== uid) return;
    cache.setQueryData(["flash-alerts", uid], data);
  }, onSettled: (result) => {
    if (result && activeUid.current === result.uid) void cache.invalidateQueries({ queryKey: ["flash-alerts", result.uid] });
  } });
  return { user, query, mutation };
}

export function FlashAlertToggle({ productId, productName }: { productId: string; productName: string }) {
  const { user, query, mutation } = useFlashAlerts();
  const enabled = Boolean(query.data?.some((alert) => alert.productId === productId));
  if (!user) return null;
  return <View style={styles.section}>
    <Pressable accessibilityRole="switch" accessibilityLabel={`Flash sale alert for ${productName}`} accessibilityState={{ checked: enabled, busy: mutation.isPending }} disabled={query.isLoading || Boolean(query.error) || mutation.isPending} onPress={() => mutation.mutate({ productId, enabled: !enabled })} style={[styles.button, enabled && styles.selected]}><Text style={enabled ? styles.selectedText : styles.text}>{mutation.isPending ? "Updating flash alert…" : enabled ? "Flash alert on — turn off" : "Notify me about a flash sale"}</Text></Pressable>
    {query.error ? <Pressable accessibilityRole="button" onPress={() => void query.refetch()} style={styles.button}><Text style={styles.error}>Could not load flash alerts. Retry</Text></Pressable> : null}
    {mutation.error ? <Text accessibilityRole="alert" style={styles.error}>{mutation.error.message}</Text> : null}
    <Text style={styles.copy}>One notification when an available product has a live flash offer. This does not change your stock or price alerts.</Text>
  </View>;
}

export function FlashAlertsPanel() {
  const { user, query, mutation } = useFlashAlerts();
  const router = useRouter();
  if (!user) return null;
  return <View style={styles.panel}>
    <Text accessibilityRole="header" style={styles.title}>Flash sale alerts</Text>
    {query.isLoading ? <Text style={styles.copy}>Loading flash alerts…</Text> : query.error ? <Pressable accessibilityRole="button" onPress={() => void query.refetch()} style={styles.button}><Text style={styles.error}>Could not load flash alerts. Retry</Text></Pressable> : query.data?.length ? query.data.map((alert) => <View key={alert.id} style={styles.section}>
      <Pressable accessibilityRole="link" accessibilityLabel={`View ${alert.productName}`} onPress={() => router.push(`/product/${alert.productId}` as never)} style={styles.button}><Text style={styles.text}>{alert.productName}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Turn off flash alert for ${alert.productName}`} disabled={mutation.isPending} onPress={() => mutation.mutate({ productId: alert.productId, enabled: false })} style={styles.button}><Text style={styles.error}>Turn off flash alert</Text></Pressable>
    </View>) : <Text style={styles.copy}>No flash alerts. Set one from a saved product in your wishlist.</Text>}
    {mutation.error ? <Text accessibilityRole="alert" style={styles.error}>{mutation.error.message}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm, minWidth: 0 },
  panel: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg },
  title: { color: colors.text, fontSize: 18, fontWeight: "600" },
  button: { minHeight: 44, padding: spacing.sm, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md },
  selected: { backgroundColor: colors.primary },
  selectedText: { color: "#fff", fontWeight: "600" },
  text: { color: colors.text, fontWeight: "600" },
  copy: { color: colors.muted, fontSize: 12, lineHeight: 20 },
  error: { color: colors.danger }
});
