import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { colors, radius, spacing } from "../../../ui/tokens";
import { formatMinor } from "../../../ui/money";
import { checkServiceability } from "../../operations/delivery-settings.api";

export function DeliveryAvailability({ subtotalMinor = "0" }: { subtotalMinor?: string }) {
  const [location, setLocation] = useState({ division: "Chattogram", district: "Cox's Bazar", upazila: "Teknaf", union: "Hnila" });
  const compact = useWindowDimensions().width < 620;
  const check = useMutation({ mutationFn: () => checkServiceability({ ...location, subtotalMinor }) });

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Text style={styles.eyebrow}>DELIVERY CHECK</Text>
      <Text style={[styles.title, compact && styles.titleCompact]}>Is delivery available in your area?</Text>
      <View style={[styles.fields, compact && styles.fieldsCompact]}>
        {Object.entries(location).map(([key, value]) => (
          <TextInput
            accessibilityLabel={key}
            key={key}
            onChangeText={(next) => setLocation({ ...location, [key]: next })}
            placeholder={key}
            placeholderTextColor={colors.muted}
            style={[styles.input, compact && styles.inputCompact]}
            value={value}
          />
        ))}
      </View>
      <Pressable accessibilityRole="button" disabled={check.isPending} onPress={() => check.mutate()} style={({ pressed }) => [styles.button, compact && styles.buttonCompact, pressed && styles.buttonPressed]}>
        <Text style={styles.buttonText}>{check.isPending ? "Checking…" : "Check availability"}</Text>
      </Pressable>
      {check.data ? (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>{check.data.serviceable ? "Delivery available" : "Not serviceable"}</Text>
          <Text style={styles.resultText}>{check.data.serviceable ? `${formatMinor(check.data.charge.amountMinor)} · ${check.data.estimatedDays.min}–${check.data.estimatedDays.max} days · ${check.data.zone.replaceAll("_", " ")}` : "This area is currently disabled by the marketplace. Contact support for manual delivery options."}</Text>
          {check.data.freeDelivery ? <Text style={styles.free}>Free delivery applies to this selection.</Text> : null}
        </View>
      ) : null}
      {check.error ? <Text style={styles.error}>{check.error.message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, shadowColor: colors.navy, shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.08, shadowRadius: 20 },
  cardCompact: { padding: spacing.md },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  title: { color: colors.text, fontSize: 21, fontWeight: "700", marginBottom: spacing.md, marginTop: spacing.xs },
  titleCompact: { fontSize: 19, lineHeight: 25 },
  fields: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  fieldsCompact: { flexDirection: "column" },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, flex: 1, minHeight: 48, minWidth: 150, paddingHorizontal: spacing.md },
  inputCompact: { minWidth: 0, width: "100%" },
  button: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", marginTop: spacing.md, minHeight: 46, paddingHorizontal: spacing.lg },
  buttonCompact: { alignSelf: "stretch", width: "100%" },
  buttonPressed: { opacity: 0.88 },
  buttonText: { color: colors.surface, fontWeight: "700" },
  result: { backgroundColor: colors.primarySoft, borderRadius: radius.md, marginTop: spacing.md, padding: spacing.md },
  resultTitle: { color: colors.success, fontWeight: "700" },
  resultText: { color: colors.text, lineHeight: 20, marginTop: spacing.xs },
  free: { color: colors.success, fontSize: 11, fontWeight: "600", marginTop: spacing.xs },
  error: { color: colors.danger, marginTop: spacing.sm }
});
