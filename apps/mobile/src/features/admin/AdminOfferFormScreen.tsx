import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { createAdminCampaign, getAdminCommerce, updateAdminCampaign } from "./admin.api";

const dateValue = (date: Date) => date.toISOString().slice(0, 10);

export function AdminOfferFormScreen({ id }: { id?: string }) {
  const user = firebaseAuth?.currentUser ?? null;
  const router = useRouter();
  const cache = useQueryClient();
  const commerce = useQuery({ queryKey: ["admin", "commerce"], queryFn: () => getAdminCommerce(user!), enabled: Boolean(user && id) });
  const campaign = commerce.data?.campaigns.find((item) => item.id === id);
  const defaults = useMemo(() => { const start = new Date(); const end = new Date(start.getTime() + 30 * 86_400_000); return { name: "", slug: "", startsAt: dateValue(start), endsAt: dateValue(end) }; }, []);
  const [form, setForm] = useState(defaults);
  useEffect(() => { if (campaign) setForm({ name: campaign.name, slug: campaign.slug, startsAt: campaign.startsAt.slice(0, 10), endsAt: campaign.endsAt.slice(0, 10) }); }, [campaign]);
  const generatedSlug = form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const submit = useMutation({ mutationFn: () => { const input = { name: form.name.trim(), slug: (form.slug.trim() || generatedSlug), startsAt: new Date(`${form.startsAt}T00:00:00.000Z`).toISOString(), endsAt: new Date(`${form.endsAt}T23:59:59.999Z`).toISOString() }; return id ? updateAdminCampaign(user!, id, input) : createAdminCampaign(user!, input); }, onSuccess: async () => { await cache.invalidateQueries({ queryKey: ["admin", "commerce"] }); router.replace("/admin/offers"); } });
  const valid = Boolean(user && form.name.trim().length >= 3 && (form.slug.trim() || generatedSlug).length >= 3 && /^\d{4}-\d{2}-\d{2}$/.test(form.startsAt) && /^\d{4}-\d{2}-\d{2}$/.test(form.endsAt) && form.startsAt < form.endsAt);
  return <Screen eyebrow="MARKETING" title={id ? "Edit offer" : "Create offer"} description="Configure the campaign identity and active marketplace window.">
    {id && commerce.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
    {id && !commerce.isLoading && !campaign ? <Text style={styles.error}>Offer not found.</Text> : null}
    {(!id || campaign) ? <><ModuleCard title="Offer details"><Field label="Campaign name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} /><Field label="URL slug" value={form.slug} placeholder={generatedSlug || "summer-sale"} onChangeText={(slug) => setForm({ ...form, slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "") })} /><View style={styles.row}><Field label="Starts (YYYY-MM-DD)" value={form.startsAt} onChangeText={(startsAt) => setForm({ ...form, startsAt })} /><Field label="Ends (YYYY-MM-DD)" value={form.endsAt} onChangeText={(endsAt) => setForm({ ...form, endsAt })} /></View></ModuleCard>{submit.error ? <Text style={styles.error}>{submit.error.message}</Text> : null}<View style={styles.footer}><Pressable onPress={() => router.back()} style={styles.secondary}><Text style={styles.secondaryText}>Cancel</Text></Pressable><Pressable disabled={!valid || submit.isPending} onPress={() => submit.mutate()} style={[styles.primary, (!valid || submit.isPending) && styles.disabled]}><Text style={styles.primaryText}>{submit.isPending ? "Saving…" : id ? "Save offer" : "Create offer"}</Text></Pressable></View></> : null}
  </Screen>;
}

function Field({ label, ...props }: { label: string; value: string; placeholder?: string; onChangeText(value: string): void }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} placeholderTextColor="#94a3b8" style={styles.input} /></View>; }
const styles = StyleSheet.create({ row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, field: { flex: 1, gap: 6, minWidth: 220 }, label: { color: colors.text, fontSize: 11, fontWeight: "900" }, input: { backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 43, paddingHorizontal: 12 }, footer: { flexDirection: "row", gap: spacing.sm, justifyContent: "flex-end" }, primary: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 13 }, primaryText: { color: colors.surface, fontWeight: "900" }, secondary: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: 13 }, secondaryText: { color: colors.text, fontWeight: "900" }, disabled: { opacity: .45 }, error: { color: colors.danger, fontWeight: "700" } });
