import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getVendorWorkspace, updateVendorShop } from "./vendor.api";

type Pickup = { name: string; phone: string; address: string; division: string; district: string; upazila: string; union: string };
const empty: Pickup = { name: "", phone: "", address: "", division: "", district: "", upazila: "", union: "" };
function pickupFrom(settings: Record<string, unknown> | null): Pickup { const value = settings?.pickupAddress; const pickup = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; return { name: String(pickup.name || ""), phone: String(pickup.phone || ""), address: String(pickup.address || pickup.line1 || ""), division: String(pickup.division || ""), district: String(pickup.district || ""), upazila: String(pickup.upazila || ""), union: String(pickup.union || pickup.unionName || "") }; }

export function VendorShopLocationScreen() {
  const user = useCurrentUser(); const activeUid = useRef(user?.uid); activeUid.current = user?.uid; const cache = useQueryClient();
  const workspace = useQuery({ queryKey: ["vendor", "workspace", user?.uid], queryFn: () => getVendorWorkspace(user!), enabled: Boolean(user), retry: false }); const shop = workspace.data?.shops[0];
  const [form, setForm] = useState<Pickup>(empty);
  useEffect(() => { setForm(shop ? pickupFrom(shop.settings) : empty); }, [shop?.id, shop?.version, user?.uid]);
  const save = useMutation({ retry: false, mutationFn: () => updateVendorShop(user!, shop!.id, { version: shop!.version, settings: { ...(shop!.settings || {}), pickupAddress: form } }), onSuccess: async () => { if (user && activeUid.current === user.uid) await cache.invalidateQueries({ queryKey: ["vendor", "workspace", user.uid] }); } });
  const valid = form.name.trim().length >= 2 && /^01\d{9}$/.test(form.phone.replace(/\s/g, "")) && form.address.trim().length >= 5 && form.division.trim().length >= 2 && form.district.trim().length >= 2 && form.upazila.trim().length >= 2;
  return <Screen eyebrow="FULFILMENT ORIGIN" title="Pickup location" description="Courier labels and seller dispatches use this verified operational address.">
    <View style={styles.hero}><View style={styles.icon}><Ionicons color={colors.surface} name="location" size={27} /></View><View style={styles.flex}><Text style={styles.heroLabel}>DEFAULT PICKUP POINT</Text><Text style={styles.heroTitle}>{form.name || shop?.name || "Set your pickup point"}</Text><Text style={styles.heroMeta}>{[form.address, form.upazila, form.district].filter(Boolean).join(", ") || "Complete every required location field."}</Text></View></View>
    <ModuleCard title="Contact & address" meta="Use a reachable Bangladesh mobile number and the exact handover location.">
      <Field label="Pickup contact name" onChangeText={(name) => setForm({ ...form, name })} value={form.name} /><Field keyboardType="phone-pad" label="Mobile number" onChangeText={(phone) => setForm({ ...form, phone })} placeholder="01XXXXXXXXX" value={form.phone} /><Field label="Street, village or market address" multiline onChangeText={(address) => setForm({ ...form, address })} value={form.address} />
      <View style={styles.grid}><Field label="Division" onChangeText={(division) => setForm({ ...form, division })} value={form.division} /><Field label="District" onChangeText={(district) => setForm({ ...form, district })} value={form.district} /><Field label="Upazila" onChangeText={(upazila) => setForm({ ...form, upazila })} value={form.upazila} /><Field label="Union / area (optional)" onChangeText={(union) => setForm({ ...form, union })} value={form.union} /></View>
      <Pressable accessibilityRole="button" disabled={!valid || save.isPending || !shop} onPress={() => save.mutate()} style={[styles.button, (!valid || save.isPending || !shop) && styles.disabled]}>{save.isPending ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.buttonText}>Save pickup location</Text>}</Pressable>
      {save.isSuccess ? <Text style={styles.success}>Pickup location updated for future dispatches.</Text> : null}{save.error ? <Text accessibilityRole="alert" style={styles.error}>{save.error.message}</Text> : null}
    </ModuleCard>
  </Screen>;
}
function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) { const { label, ...rest } = props; return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor={colors.muted} style={[styles.input, rest.multiline && styles.multiline]} {...rest} /></View>; }
const styles = StyleSheet.create({ flex: { flex: 1 }, hero: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", gap: spacing.md, padding: spacing.xl }, icon: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, height: 56, justifyContent: "center", width: 56 }, heroLabel: { color: "#d9e6a7", fontSize: 9, fontWeight: "700", letterSpacing: 1 }, heroTitle: { color: colors.surface, fontSize: 21, fontWeight: "700", marginTop: 4 }, heroMeta: { color: "#cbd5e1", fontSize: 11, marginTop: 4 }, grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, field: { flex: 1, gap: 6, minWidth: 210 }, label: { color: colors.text, fontSize: 12, fontWeight: "600" }, input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 48, paddingHorizontal: 13 }, multiline: { minHeight: 90, paddingVertical: 12, textAlignVertical: "top" }, button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 48 }, buttonText: { color: colors.surface, fontWeight: "700" }, disabled: { opacity: .45 }, success: { color: colors.success, fontWeight: "600" }, error: { color: colors.danger } });
