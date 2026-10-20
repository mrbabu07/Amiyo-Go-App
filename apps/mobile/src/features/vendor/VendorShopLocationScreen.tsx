import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@firebase/auth";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getVendorWorkspace, updateVendorShop } from "./vendor.api";

type Pickup = { name: string; phone: string; address: string; division: string; district: string; upazila: string; union: string };
const empty: Pickup = { name: "", phone: "", address: "", division: "", district: "", upazila: "", union: "" };

function pickupFrom(settings: Record<string, unknown> | null): Pickup {
  const value = settings?.pickupAddress;
  const pickup = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return { name: String(pickup.name || ""), phone: String(pickup.phone || ""), address: String(pickup.address || pickup.line1 || ""), division: String(pickup.division || ""), district: String(pickup.district || ""), upazila: String(pickup.upazila || ""), union: String(pickup.union || pickup.unionName || "") };
}

export function VendorShopLocationScreen() {
  const compact = useWindowDimensions().width < 620;
  const user = useCurrentUser();
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;
  const cache = useQueryClient();
  const workspace = useQuery({ queryKey: ["vendor", "workspace", user?.uid], queryFn: () => getVendorWorkspace(user!), enabled: Boolean(user), retry: false });
  const shop = workspace.data?.shops[0];
  const [form, setForm] = useState<Pickup>(empty);

  useEffect(() => { setForm(shop ? pickupFrom(shop.settings) : empty); }, [shop?.id, shop?.version, user?.uid]);

  const save = useMutation({
    retry: false,
    mutationFn: ({ owner, shopId, version }: { owner: User; shopId: string; version: number }) => updateVendorShop(owner, shopId, { version, settings: { ...(shop!.settings || {}), pickupAddress: form } }),
    onSuccess: async (_data, variables) => {
      if (activeUid.current !== variables.owner.uid) return;
      await cache.invalidateQueries({ queryKey: ["vendor", "workspace", variables.owner.uid] });
    }
  });
  const valid = form.name.trim().length >= 2 && /^01\d{9}$/.test(form.phone.replace(/\s/g, "")) && form.address.trim().length >= 5 && form.division.trim().length >= 2 && form.district.trim().length >= 2 && form.upazila.trim().length >= 2;

  return <Screen eyebrow="FULFILMENT ORIGIN" title="Pickup location" description="Courier labels and seller dispatches use this verified operational address.">
    <View style={[styles.hero, compact && styles.heroCompact]}><View style={styles.icon}><Ionicons color={colors.surface} name="location" size={27} /></View><View style={styles.flex}><Text style={styles.heroLabel}>DEFAULT PICKUP POINT</Text><Text style={styles.heroTitle}>{form.name || shop?.name || "Set your pickup point"}</Text><Text style={styles.heroMeta}>{[form.address, form.upazila, form.district].filter(Boolean).join(", ") || "Complete every required location field."}</Text></View></View>
    <ModuleCard title="Contact & address" meta="Use a reachable Bangladesh mobile number and the exact handover location.">
      <Field compact={compact} label="Pickup contact name" onChangeText={(name) => setForm({ ...form, name })} value={form.name} />
      <Field compact={compact} keyboardType="phone-pad" label="Mobile number" onChangeText={(phone) => setForm({ ...form, phone })} placeholder="01XXXXXXXXX" value={form.phone} />
      <Field compact={compact} label="Street, village or market address" multiline onChangeText={(address) => setForm({ ...form, address })} value={form.address} />
      <View style={[styles.grid, compact && styles.gridCompact]}>
        <Field compact={compact} label="Division" onChangeText={(division) => setForm({ ...form, division })} value={form.division} />
        <Field compact={compact} label="District" onChangeText={(district) => setForm({ ...form, district })} value={form.district} />
        <Field compact={compact} label="Upazila" onChangeText={(upazila) => setForm({ ...form, upazila })} value={form.upazila} />
        <Field compact={compact} label="Union / area (optional)" onChangeText={(union) => setForm({ ...form, union })} value={form.union} />
      </View>
      <Pressable accessibilityRole="button" disabled={!valid || save.isPending || !shop || !user} onPress={() => user && shop && save.mutate({ owner: user, shopId: shop.id, version: shop.version })} style={[styles.button, (!valid || save.isPending || !shop || !user) && styles.disabled]}>{save.isPending ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.buttonText}>Save pickup location</Text>}</Pressable>
      {save.isSuccess ? <Text style={styles.success}>Pickup location updated for future dispatches.</Text> : null}
      {save.error ? <Text accessibilityRole="alert" style={styles.error}>{save.error.message}</Text> : null}
    </ModuleCard>
  </Screen>;
}

function Field(props: React.ComponentProps<typeof TextInput> & { compact: boolean; label: string }) {
  const { compact, label, ...rest } = props;
  return <View style={[styles.field, compact && styles.fieldCompact]}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor={colors.muted} style={[styles.input, rest.multiline && styles.multiline]} {...rest} /></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, hero: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", gap: spacing.md, padding: spacing.xl }, heroCompact: { alignItems: "flex-start", padding: spacing.lg },
  icon: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, height: 56, justifyContent: "center", width: 56 }, heroLabel: { color: "#d9e6a7", fontSize: 9, fontWeight: "700", letterSpacing: 1 }, heroTitle: { color: colors.surface, fontSize: 21, fontWeight: "700", marginTop: 4 }, heroMeta: { color: "#cbd5e1", fontSize: 11, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, gridCompact: { flexDirection: "column" },
  field: { flex: 1, gap: 6, minWidth: 210 }, fieldCompact: { flex: 0, minWidth: 0, width: "100%" }, label: { color: colors.text, fontSize: 12, fontWeight: "600" },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 48, paddingHorizontal: 13 }, multiline: { minHeight: 90, paddingVertical: 12, textAlignVertical: "top" },
  button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 48 }, buttonText: { color: colors.surface, fontWeight: "700" }, disabled: { opacity: .45 }, success: { color: colors.success, fontWeight: "600" }, error: { color: colors.danger }
});
