import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { colors, radius, spacing } from "../../../ui/tokens";
import { subscribeNewsletter } from "../../engagement/engagement.api";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const compact = useWindowDimensions().width < 620;
  const subscribe = useMutation({ mutationFn: () => subscribeNewsletter(email.trim()), onSuccess: () => setEmail("") });

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={[styles.copy, compact && styles.copyCompact]}>
        <Text style={styles.eyebrow}>STAY UPDATED</Text>
        <Text style={[styles.title, compact && styles.titleCompact]}>Deals and new arrivals in your inbox</Text>
        <Text style={styles.text}>Get verified offers from Amiyo-Go. No spam, and you can unsubscribe anytime.</Text>
      </View>
      <View style={[styles.form, compact && styles.formCompact]}>
        <TextInput accessibilityLabel="Newsletter email" autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder="Enter your email address" placeholderTextColor={colors.muted} style={styles.input} value={email} />
        <Pressable accessibilityRole="button" disabled={subscribe.isPending || !email.includes("@")} onPress={() => subscribe.mutate()} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
          <Text style={styles.buttonText}>{subscribe.isPending ? "Subscribing…" : "Subscribe"}</Text>
        </Pressable>
        {subscribe.isSuccess ? <Text style={styles.success}>Thanks for subscribing!</Text> : null}
        {subscribe.error ? <Text style={styles.error}>{subscribe.error.message}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.primarySoft, borderRadius: radius.xl, flexDirection: "row", flexWrap: "wrap", gap: spacing.lg, padding: spacing.lg },
  cardCompact: { flexDirection: "column", gap: spacing.md, padding: spacing.md },
  copy: { flex: 1, minWidth: 240 },
  copyCompact: { minWidth: 0, width: "100%" },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  title: { color: colors.text, fontSize: 22, fontWeight: "700", marginTop: spacing.xs },
  titleCompact: { fontSize: 19, lineHeight: 25 },
  text: { color: colors.muted, lineHeight: 20, marginTop: spacing.sm },
  form: { flex: 1, minWidth: 240 },
  formCompact: { minWidth: 0, width: "100%" },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, height: 48, paddingHorizontal: spacing.md },
  button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", marginTop: spacing.sm, minHeight: 46, paddingHorizontal: spacing.md },
  buttonPressed: { opacity: 0.88 },
  buttonText: { color: colors.surface, fontWeight: "700" },
  success: { color: colors.success, fontWeight: "600", marginTop: spacing.sm },
  error: { color: colors.danger, marginTop: spacing.sm }
});
