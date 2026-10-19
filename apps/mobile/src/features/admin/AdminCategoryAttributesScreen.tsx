import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, useWindowDimensions, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getAdminPlatform, replaceAdminCategoryAttributes } from "./admin.api";

const dataTypes = ["text", "number", "boolean", "select", "multiselect"] as const;

export function AdminCategoryAttributesScreen({ initialCategoryId = "" }: { initialCategoryId?: string }) {
  const compact = useWindowDimensions().width < 620;
  const user = useCurrentUser();
  const userId = user?.uid ?? null;
  const queryClient = useQueryClient();
  const platform = useQuery({ queryKey: ["admin", "platform", userId], queryFn: () => getAdminPlatform(user!), enabled: Boolean(user), retry: false });
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [form, setForm] = useState({ label: "", key: "", dataType: "text" as typeof dataTypes[number], options: "", required: false, filterable: false });
  const selected = useMemo(() => platform.data?.categories.find((category) => category.id === categoryId), [categoryId, platform.data]);
  const save = useMutation({
    mutationFn: (attributes: NonNullable<typeof selected>["attributes"]) => { if (!user || user.uid !== userId) throw new Error("Account changed. Reopen category attributes."); return replaceAdminCategoryAttributes(user, categoryId, { attributes: attributes.map((attribute, displayOrder) => ({ key: attribute.key, label: attribute.label, dataType: attribute.dataType, required: attribute.required, filterable: attribute.filterable, displayOrder, options: attribute.options.map((option) => option.label) })) }); },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["admin", "platform", userId] }); }
  });
  async function addAttribute() {
    if (!selected || !form.label.trim() || !form.key.trim()) return;
    const options = form.options.split(",").map((option) => option.trim()).filter(Boolean);
    const temporaryId = `temporary-${Date.now()}`;
    await save.mutateAsync([...selected.attributes, { id: temporaryId, key: form.key.trim(), label: form.label.trim(), dataType: form.dataType, required: form.required, filterable: form.filterable, displayOrder: selected.attributes.length, options: options.map((option, displayOrder) => ({ id: `${temporaryId}-${displayOrder}`, value: option.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label: option, displayOrder })) }]);
    setForm({ label: "", key: "", dataType: "text", options: "", required: false, filterable: false });
  }
  if (platform.isLoading) return <Screen title="Category attributes"><ActivityIndicator color={colors.primary} /></Screen>;
  return <Screen eyebrow="ADMIN TAXONOMY" title="Category attributes" description="Build the dynamic product fields and discovery filters used by each category.">
    <View style={[catalogStyles.hero, compact && catalogStyles.heroCompact]}><View style={catalogStyles.heroCopy}><Text style={catalogStyles.heroEyebrow}>CATALOG FIELD ARCHITECTURE</Text><Text style={catalogStyles.heroTitle}>{platform.data?.categories.reduce((sum, category) => sum + category.attributes.length, 0) ?? 0} dynamic fields across the catalog</Text><Text style={catalogStyles.heroText}>Control seller product forms and customer filters without shipping a new application build.</Text></View><View style={catalogStyles.heroBadge}><Ionicons color={colors.surface} name="options-outline" size={24} /><Text style={catalogStyles.heroBadgeValue}>{platform.data?.categories.length ?? 0}</Text><Text style={catalogStyles.heroBadgeLabel}>CATEGORIES</Text></View></View>
    {platform.error ? <Text style={styles.error}>{platform.error.message}</Text> : null}
    <Text style={styles.heading}>Choose category</Text>
    <View style={styles.chips}>{platform.data?.categories.map((category) => <Pressable accessibilityRole="button" key={category.id} onPress={() => setCategoryId(category.id)} style={[styles.chip, categoryId === category.id && styles.chipActive]}><Text style={[styles.chipText, categoryId === category.id && styles.chipTextActive]}>{category.name} ({category.attributes.length})</Text></Pressable>)}</View>
    {selected ? <>
      <ModuleCard title={`Add field to ${selected.name}`} meta="Use comma-separated options for select fields.">
        <TextInput onChangeText={(label) => setForm({ ...form, label, key: label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "") })} placeholder="Attribute label" placeholderTextColor={colors.muted} style={styles.input} value={form.label} />
        <Text style={styles.muted}>Key: {form.key || "—"}</Text>
        <View style={styles.chips}>{dataTypes.map((dataType) => <Pressable key={dataType} onPress={() => setForm({ ...form, dataType })} style={[styles.chip, form.dataType === dataType && styles.chipActive]}><Text style={[styles.chipText, form.dataType === dataType && styles.chipTextActive]}>{dataType}</Text></Pressable>)}</View>
        {form.dataType === "select" || form.dataType === "multiselect" ? <TextInput onChangeText={(options) => setForm({ ...form, options })} placeholder="Small, Medium, Large" placeholderTextColor={colors.muted} style={styles.input} value={form.options} /> : null}
        <View style={[catalogStyles.toggleRow, compact && catalogStyles.toggleRowCompact]}><AttributeToggle label="Required for sellers" value={form.required} onChange={(required) => setForm({ ...form, required })} /><AttributeToggle label="Customer filter" value={form.filterable} onChange={(filterable) => setForm({ ...form, filterable })} /></View>
        <Pressable disabled={save.isPending} onPress={addAttribute} style={styles.primary}><Text style={styles.primaryText}>{save.isPending ? "Saving…" : "Add attribute"}</Text></Pressable>
      </ModuleCard>
      {save.error ? <Text style={styles.error}>{save.error.message}</Text> : null}
      {selected.attributes.map((attribute) => <ModuleCard key={attribute.id} title={attribute.label} meta={`${attribute.dataType} · ${attribute.key}`}>
        {attribute.options.length ? <Text style={styles.muted}>Options: {attribute.options.map((option) => option.label).join(", ")}</Text> : null}
        <View style={[catalogStyles.toggleRow, compact && catalogStyles.toggleRowCompact]}><AttributeToggle label="Required for sellers" value={attribute.required} onChange={(required) => save.mutate(selected.attributes.map((item) => item.id === attribute.id ? { ...item, required } : item))} /><AttributeToggle label="Customer filter" value={attribute.filterable} onChange={(filterable) => save.mutate(selected.attributes.map((item) => item.id === attribute.id ? { ...item, filterable } : item))} /></View>
        <Pressable disabled={save.isPending} onPress={() => save.mutate(selected.attributes.filter((item) => item.id !== attribute.id))} style={styles.delete}><Text style={styles.deleteText}>Remove attribute</Text></Pressable>
      </ModuleCard>)}
      {selected.attributes.length === 0 ? <ModuleCard title="No attributes yet" meta="Add the first dynamic product field above." /> : null}
    </> : <ModuleCard title="Select a category" meta="Choose a category to manage its product fields." />}
  </Screen>;
}

function AttributeToggle({ label, onChange, value }: { label: string; onChange(value: boolean): void; value: boolean }) { return <View style={catalogStyles.toggle}><Text style={catalogStyles.toggleLabel}>{label}</Text><Switch onValueChange={onChange} trackColor={{ false: colors.border, true: colors.primarySoft }} thumbColor={value ? colors.primary : colors.muted} value={value} /></View>; }

const catalogStyles = StyleSheet.create({
  hero: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", gap: spacing.lg, justifyContent: "space-between", padding: spacing.xl },
  heroCompact: { alignItems: "stretch", flexDirection: "column", padding: spacing.lg },
  heroCopy: { flex: 1, minWidth: 0 },
  heroEyebrow: { color: colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 1.1 },
  heroTitle: { color: colors.surface, fontSize: 24, fontWeight: "700", marginTop: 7 },
  heroText: { color: "#C9C2B6", fontSize: 11, lineHeight: 18, marginTop: 6 },
  heroBadge: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, minWidth: 125, padding: spacing.md },
  heroBadgeValue: { color: colors.surface, fontSize: 25, fontWeight: "700", marginTop: 4 },
  heroBadgeLabel: { color: colors.surface, fontSize: 8, fontWeight: "700", letterSpacing: .7, marginTop: 3 },
  toggleRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  toggleRowCompact: { flexDirection: "column" },
  toggle: { alignItems: "center", backgroundColor: colors.background, borderRadius: radius.md, flex: 1, flexDirection: "row", justifyContent: "space-between", minWidth: 210, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  toggleLabel: { color: colors.text, flex: 1, fontSize: 11, fontWeight: "600" }
});

const styles = StyleSheet.create({ heading: { color: colors.text, fontSize: 20, fontWeight: "700" }, error: { color: colors.danger }, muted: { color: colors.muted }, chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, chip: { borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary }, chipText: { color: colors.muted, fontWeight: "700" }, chipTextActive: { color: colors.primary }, input: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 46, paddingHorizontal: spacing.md }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, minHeight: 46, justifyContent: "center" }, primaryText: { color: colors.surface, fontWeight: "700" }, delete: { alignItems: "center", borderColor: colors.danger, borderRadius: radius.md, borderWidth: 1, minHeight: 42, justifyContent: "center" }, deleteText: { color: colors.danger, fontWeight: "600" } });
