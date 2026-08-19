import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { getAdminPlatform, replaceAdminCategoryAttributes } from "./admin.api";

const dataTypes = ["text", "number", "boolean", "select", "multiselect"] as const;

export function AdminCategoryAttributesScreen({ initialCategoryId = "" }: { initialCategoryId?: string }) {
  const user = firebaseAuth?.currentUser ?? null;
  const queryClient = useQueryClient();
  const platform = useQuery({ queryKey: ["admin", "platform"], queryFn: () => getAdminPlatform(user!), enabled: Boolean(user) });
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [form, setForm] = useState({ label: "", key: "", dataType: "text" as typeof dataTypes[number], options: "" });
  const selected = useMemo(() => platform.data?.categories.find((category) => category.id === categoryId), [categoryId, platform.data]);
  const save = useMutation({
    mutationFn: (attributes: NonNullable<typeof selected>["attributes"]) => replaceAdminCategoryAttributes(user!, categoryId, { attributes: attributes.map((attribute, displayOrder) => ({ key: attribute.key, label: attribute.label, dataType: attribute.dataType, required: attribute.required, filterable: attribute.filterable, displayOrder, options: attribute.options.map((option) => option.label) })) }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["admin", "platform"] }); }
  });
  async function addAttribute() {
    if (!selected || !form.label.trim() || !form.key.trim()) return;
    const options = form.options.split(",").map((option) => option.trim()).filter(Boolean);
    const temporaryId = `temporary-${Date.now()}`;
    await save.mutateAsync([...selected.attributes, { id: temporaryId, key: form.key.trim(), label: form.label.trim(), dataType: form.dataType, required: false, filterable: false, displayOrder: selected.attributes.length, options: options.map((option, displayOrder) => ({ id: `${temporaryId}-${displayOrder}`, value: option.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label: option, displayOrder })) }]);
    setForm({ label: "", key: "", dataType: "text", options: "" });
  }
  if (platform.isLoading) return <Screen title="Category attributes"><ActivityIndicator color={colors.primary} /></Screen>;
  return <Screen eyebrow="ADMIN TAXONOMY" title="Category attributes" description="Build the dynamic product fields and discovery filters used by each category.">
    {platform.error ? <Text style={styles.error}>{platform.error.message}</Text> : null}
    <Text style={styles.heading}>Choose category</Text>
    <View style={styles.chips}>{platform.data?.categories.map((category) => <Pressable accessibilityRole="button" key={category.id} onPress={() => setCategoryId(category.id)} style={[styles.chip, categoryId === category.id && styles.chipActive]}><Text style={[styles.chipText, categoryId === category.id && styles.chipTextActive]}>{category.name} ({category.attributes.length})</Text></Pressable>)}</View>
    {selected ? <>
      <ModuleCard title={`Add field to ${selected.name}`} meta="Use comma-separated options for select fields.">
        <TextInput onChangeText={(label) => setForm({ ...form, label, key: label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "") })} placeholder="Attribute label" placeholderTextColor={colors.muted} style={styles.input} value={form.label} />
        <Text style={styles.muted}>Key: {form.key || "—"}</Text>
        <View style={styles.chips}>{dataTypes.map((dataType) => <Pressable key={dataType} onPress={() => setForm({ ...form, dataType })} style={[styles.chip, form.dataType === dataType && styles.chipActive]}><Text style={[styles.chipText, form.dataType === dataType && styles.chipTextActive]}>{dataType}</Text></Pressable>)}</View>
        {form.dataType === "select" || form.dataType === "multiselect" ? <TextInput onChangeText={(options) => setForm({ ...form, options })} placeholder="Small, Medium, Large" placeholderTextColor={colors.muted} style={styles.input} value={form.options} /> : null}
        <Pressable disabled={save.isPending} onPress={addAttribute} style={styles.primary}><Text style={styles.primaryText}>{save.isPending ? "Saving…" : "Add attribute"}</Text></Pressable>
      </ModuleCard>
      {save.error ? <Text style={styles.error}>{save.error.message}</Text> : null}
      {selected.attributes.map((attribute) => <ModuleCard key={attribute.id} title={attribute.label} meta={`${attribute.dataType} · ${attribute.key}`}>
        {attribute.options.length ? <Text style={styles.muted}>Options: {attribute.options.map((option) => option.label).join(", ")}</Text> : null}
        <Pressable disabled={save.isPending} onPress={() => save.mutate(selected.attributes.filter((item) => item.id !== attribute.id))} style={styles.delete}><Text style={styles.deleteText}>Remove attribute</Text></Pressable>
      </ModuleCard>)}
      {selected.attributes.length === 0 ? <ModuleCard title="No attributes yet" meta="Add the first dynamic product field above." /> : null}
    </> : <ModuleCard title="Select a category" meta="Choose a category to manage its product fields." />}
  </Screen>;
}

const styles = StyleSheet.create({ heading: { color: colors.text, fontSize: 20, fontWeight: "700" }, error: { color: colors.danger }, muted: { color: colors.muted }, chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, chip: { borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary }, chipText: { color: colors.muted, fontWeight: "700" }, chipTextActive: { color: colors.primary }, input: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 46, paddingHorizontal: spacing.md }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, minHeight: 46, justifyContent: "center" }, primaryText: { color: colors.surface, fontWeight: "700" }, delete: { alignItems: "center", borderColor: colors.danger, borderRadius: radius.md, borderWidth: 1, minHeight: 42, justifyContent: "center" }, deleteText: { color: colors.danger, fontWeight: "600" } });
