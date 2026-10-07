import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { useCurrentUser } from "../auth/use-current-user";
import { alertMinorToPrice, alertPriceToMinor } from "./alert-price";
import { getAlerts, removeAlert, saveAlert } from "./engagement.api";

export function ProductAlertControls({ productId, productName }: { productId: string; productName: string }) {
  const user = useCurrentUser();
  return user ? <AlertEditor key={`${user.uid}:${productId}`} productId={productId} productName={productName} /> : null;
}

function AlertEditor({ productId, productName }: { productId: string; productName: string }) {
  const user = useCurrentUser();
  const cache = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["alerts", user?.uid ?? null], queryFn: () => getAlerts(user!), enabled: Boolean(user), staleTime: 30_000 });
  const saved = query.data?.find((alert) => alert.productId === productId);
  const value = draft ?? (saved?.target ? alertMinorToPrice(saved.target.amountMinor) : "");
  const mutation = useMutation({
    retry: false,
    mutationFn: async (action: "price" | "stock" | "off") => {
      if (!user || firebaseAuth?.currentUser?.uid !== user.uid) throw new Error("Your account changed. Sign in again.");
      const target = action === "price" ? alertPriceToMinor(value) : null;
      const data = action === "off" ? await removeAlert(user, productId) : await saveAlert(user, productId, target);
      return { uid: user.uid, data };
    },
    onSuccess: ({ uid, data }) => {
      if (firebaseAuth?.currentUser?.uid !== uid) return;
      cache.setQueryData(["alerts", uid], data);
      setDraft(null);
    },
    onSettled: () => {
      if (user && firebaseAuth?.currentUser?.uid === user.uid) void cache.invalidateQueries({ queryKey: ["alerts", user.uid] });
    }
  });
  const disabled = query.isLoading || Boolean(query.error) || mutation.isPending;
  return <View style={styles.panel}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Product alerts for ${productName}`} accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={styles.button}>
      <Text style={styles.label}>{saved ? "Manage product alert" : "Set product alert"}</Text>
    </Pressable>
    {expanded ? <View style={styles.form}>
      <Text style={styles.copy}>{saved ? saved.target ? `Active: at or below ৳${alertMinorToPrice(saved.target.amountMinor)}` : "Active: notify when available" : "No active alert for this product"}</Text>
      <Text style={styles.label}>Target price (BDT)</Text>
      <TextInput accessibilityLabel={`Target price in BDT for ${productName}`} editable={!disabled} inputMode="decimal" keyboardType="decimal-pad" maxLength={20} value={value} onChangeText={(text) => { setDraft(text); mutation.reset(); }} placeholder="e.g. 500.00" placeholderTextColor={colors.muted} style={styles.input} />
      <Pressable accessibilityRole="button" disabled={disabled} onPress={() => mutation.mutate("price")} style={[styles.primary, disabled && styles.disabled]}><Text style={styles.primaryText}>{mutation.isPending ? "Saving…" : "Save target price"}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={disabled} onPress={() => mutation.mutate("stock")} style={[styles.button, disabled && styles.disabled]}><Text style={styles.label}>Notify when available instead</Text></Pressable>
      {saved ? <Pressable accessibilityRole="button" disabled={disabled} onPress={() => mutation.mutate("off")} style={styles.button}><Text style={styles.error}>Turn off alert</Text></Pressable> : null}
      <Text style={styles.copy}>One alert per product across your lists. Saving replaces the current rule. It turns off after a match. In-app updates; email and push follow your account preferences.</Text>
      {query.error ? <Pressable accessibilityRole="button" onPress={() => void query.refetch()} style={styles.button}><Text style={styles.error}>Could not load alerts. Tap to retry.</Text></Pressable> : null}
      {mutation.error ? <Text accessibilityRole="alert" style={styles.error}>{mutation.error.message}</Text> : null}
      {mutation.isSuccess ? <Text accessibilityLiveRegion="polite" style={styles.copy}>Alert updated.</Text> : null}
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  panel: { padding: spacing.sm, minWidth: 0 },
  form: { gap: spacing.sm, padding: spacing.sm },
  button: { minHeight: 44, justifyContent: "center", alignItems: "center", padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  label: { color: colors.text, fontWeight: "600", flexShrink: 1 },
  copy: { color: colors.muted, lineHeight: 20, fontSize: 12 },
  input: { minHeight: 44, minWidth: 0, color: colors.text, backgroundColor: colors.background, borderRadius: radius.md, paddingHorizontal: spacing.sm },
  primary: { minHeight: 44, justifyContent: "center", alignItems: "center", padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.primary },
  primaryText: { color: "#fff", fontWeight: "600" },
  error: { color: colors.danger },
  disabled: { opacity: 0.5 }
});
