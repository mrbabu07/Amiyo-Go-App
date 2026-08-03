import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { createMyAddress, getMyAddresses } from "../auth/auth.api";
import { firebaseAuth } from "../auth/firebase";

export function AddressesScreen() {
  const user = firebaseAuth?.currentUser ?? null;
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "Home", recipientName: "", phone: "", line1: "", division: "Dhaka", district: "Dhaka" });
  const addresses = useQuery({ queryKey: ["me", "addresses"], queryFn: () => getMyAddresses(user!), enabled: Boolean(user) });
  async function save() { if (!user) return; setBusy(true); setError(null); try { await createMyAddress(user, { ...form, isDefault: addresses.data?.length === 0 }); await queryClient.invalidateQueries({ queryKey: ["me", "addresses"] }); setForm({ label: "Home", recipientName: "", phone: "", line1: "", division: "Dhaka", district: "Dhaka" }); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save address"); } finally { setBusy(false); } }
  return <Screen eyebrow="DELIVERY" title="Saved addresses" description="Manage the locations used during checkout."><ModuleCard title="Add a new address"><Field label="Label" value={form.label} onChangeText={(label) => setForm({ ...form, label })} /><Field label="Recipient name" value={form.recipientName} onChangeText={(recipientName) => setForm({ ...form, recipientName })} /><Field label="Phone" value={form.phone} onChangeText={(phone) => setForm({ ...form, phone })} /><Field label="Street address" value={form.line1} onChangeText={(line1) => setForm({ ...form, line1 })} /><View style={styles.row}><View style={styles.flex}><Field label="Division" value={form.division} onChangeText={(division) => setForm({ ...form, division })} /></View><View style={styles.flex}><Field label="District" value={form.district} onChangeText={(district) => setForm({ ...form, district })} /></View></View>{error ? <Text style={styles.error}>{error}</Text> : null}<Pressable disabled={busy} onPress={save} style={styles.primary}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save address</Text>}</Pressable></ModuleCard>{addresses.data?.map((address) => <ModuleCard key={address.id} title={address.label} meta={address.isDefault ? "Default delivery address" : undefined}><Text style={styles.name}>{address.recipientName} · {address.phone}</Text><Text style={styles.muted}>{address.line1}, {address.district}, {address.division}</Text></ModuleCard>)}</Screen>;
}
function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) { const { label, ...rest } = props; return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor={colors.muted} style={styles.input} {...rest} /></View>; }
const styles = StyleSheet.create({ row: { flexDirection: "row", gap: spacing.sm }, flex: { flex: 1 }, field: { gap: 5 }, label: { color: colors.text, fontSize: 12, fontWeight: "800" }, input: { backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 46, paddingHorizontal: 13 }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 46 }, primaryText: { color: "#fff", fontWeight: "900" }, error: { color: colors.danger }, name: { color: colors.text, fontWeight: "800" }, muted: { color: colors.muted } });
