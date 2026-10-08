import { useQuery } from "@tanstack/react-query";
import type { User } from "firebase/auth";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { getOwnReturn } from "../operations/operations.api";
import { returnSupportDraft, validReturnContext } from "./return-support-draft";

export function ReturnSupportContext({ user, returnId, onApply }: { user: User; returnId: string; onApply(draft: ReturnType<typeof returnSupportDraft>): void }) {
  const valid = validReturnContext(returnId);
  const query = useQuery({ queryKey: ["support-return-context", user.uid, returnId], queryFn: () => getOwnReturn(user, returnId), enabled: valid, retry: false });
  return <View style={styles.panel}>
    <Text accessibilityRole="header" style={styles.title}>Return support</Text>
    {!valid ? <Text accessibilityRole="alert" style={styles.error}>Invalid return reference. Open support from your return request.</Text> : query.isLoading ? <ActivityIndicator color={colors.primary} /> : query.error ? <><Text accessibilityRole="alert" style={styles.error}>Could not verify this return in your account.</Text><Pressable accessibilityRole="button" onPress={() => void query.refetch()} style={styles.button}><Text style={styles.buttonText}>Retry return lookup</Text></Pressable></> : query.data ? <>
      <Text style={styles.copy}>Return #{query.data.id.slice(0, 8).toUpperCase()} · {query.data.status.replaceAll("_", " ")}</Text>
      <Text style={styles.copy}>Use the verified return details to replace the subject and message below. Review before submitting; no ticket is sent automatically.</Text>
      <Pressable accessibilityRole="button" onPress={() => onApply(returnSupportDraft(query.data!))} style={styles.button}><Text style={styles.buttonText}>Use return details</Text></Pressable>
    </> : null}
  </View>;
}

const styles = StyleSheet.create({
  panel: { padding: spacing.md, gap: spacing.sm, backgroundColor: colors.primarySoft, borderRadius: radius.md },
  title: { color: colors.text, fontSize: 17, fontWeight: "600" },
  copy: { color: colors.text, lineHeight: 21 },
  error: { color: colors.danger },
  button: { minHeight: 44, padding: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontWeight: "600" }
});
