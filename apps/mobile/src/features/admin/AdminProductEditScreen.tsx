import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { getAdminProducts, getCategories, updateAdminProduct } from "../catalog/catalog.api";

export function AdminProductEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = firebaseAuth?.currentUser ?? null;
  const router = useRouter();
  const cache = useQueryClient();
  const products = useQuery({ queryKey: ["admin", "catalog"], queryFn: () => getAdminProducts(user!), enabled: Boolean(user) });
  const categories = useQuery({ queryKey: ["categories", "admin-product"], queryFn: getCategories });
  const product = products.data?.find((item) => item.id === id);
  const [form, setForm] = useState({ name: "", brand: "", description: "", categoryId: "" });
  useEffect(() => { if (product) setForm({ name: product.name, brand: product.brand ?? "", description: product.description ?? "", categoryId: product.categoryId }); }, [product]);
  const save = useMutation({ mutationFn: () => updateAdminProduct(user!, id, { version: product!.version, name: form.name.trim(), brand: form.brand.trim() || null, description: form.description.trim() || null, categoryId: form.categoryId }), onSuccess: async () => { await cache.invalidateQueries({ queryKey: ["admin", "catalog"] }); router.replace("/admin/products"); } });
  const valid = Boolean(product && form.name.trim().length >= 3 && form.categoryId);
  return <Screen eyebrow="ADMIN CATALOG" title="Edit product" description="Update listing content and marketplace category without changing its moderation status.">
    {products.isLoading || categories.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
    {!products.isLoading && !product ? <Text style={styles.error}>Product not found.</Text> : null}
    {product ? <><ModuleCard title="Product information" meta={`${product.shopName} · ${product.status} · version ${product.version}`}><Field label="Product name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} /><Field label="Brand" value={form.brand} onChangeText={(brand) => setForm({ ...form, brand })} /><Field label="Description" multiline value={form.description} onChangeText={(description) => setForm({ ...form, description })} /></ModuleCard><ModuleCard title="Category"><View style={styles.choices}>{categories.data?.map((category) => <Pressable key={category.id} onPress={() => setForm({ ...form, categoryId: category.id })} style={[styles.choice, form.categoryId === category.id && styles.choiceActive]}><Text style={[styles.choiceText, form.categoryId === category.id && styles.choiceTextActive]}>{category.name}</Text></Pressable>)}</View></ModuleCard>{save.error ? <Text style={styles.error}>{save.error.message}</Text> : null}<View style={styles.footer}><Pressable onPress={() => router.back()} style={styles.secondary}><Text style={styles.secondaryText}>Cancel</Text></Pressable><Pressable disabled={!valid || save.isPending} onPress={() => save.mutate()} style={[styles.primary, (!valid || save.isPending) && styles.disabled]}><Text style={styles.primaryText}>{save.isPending ? "Saving…" : "Save changes"}</Text></Pressable></View></> : null}
  </Screen>;
}

function Field({ label, ...props }: { label: string; value: string; multiline?: boolean; onChangeText(value: string): void }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} placeholderTextColor="#94a3b8" style={[styles.input, props.multiline && styles.multiline]} /></View>; }
const styles = StyleSheet.create({ field: { gap: 6 }, label: { color: colors.text, fontSize: 11, fontWeight: "900" }, input: { backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 43, paddingHorizontal: 12 }, multiline: { minHeight: 110, paddingTop: 12, textAlignVertical: "top" }, choices: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, choice: { borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 }, choiceActive: { backgroundColor: colors.primary, borderColor: colors.primary }, choiceText: { color: colors.muted, fontSize: 10, fontWeight: "800" }, choiceTextActive: { color: colors.surface }, footer: { flexDirection: "row", gap: spacing.sm, justifyContent: "flex-end" }, primary: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 13 }, primaryText: { color: colors.surface, fontWeight: "900" }, secondary: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: 13 }, secondaryText: { color: colors.text, fontWeight: "900" }, disabled: { opacity: .45 }, error: { color: colors.danger, fontWeight: "700" } });
