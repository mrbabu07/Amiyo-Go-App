import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { parseMajorToMinor } from "../../ui/money";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { createVendorProduct, getCategories, getShops } from "../catalog/catalog.api";

export function AdminProductCreateScreen() {
  const compact = useWindowDimensions().width < 620;
  const user = useCurrentUser();
  const userId = user?.uid ?? null;
  const router = useRouter();
  const shops = useQuery({ queryKey: ["shops", "admin-product"], queryFn: getShops });
  const categories = useQuery({ queryKey: ["categories", "admin-product"], queryFn: getCategories });
  const [form, setForm] = useState({ shopId: "", categoryId: "", name: "", brand: "", description: "", sku: "", price: "", onHand: "0" });
  const selectedShop = form.shopId || shops.data?.data[0]?.id || "";
  const selectedCategory = form.categoryId || categories.data?.find((item) => !item.parentId)?.id || categories.data?.[0]?.id || "";
  const slug = useMemo(() => form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), [form.name]);
  const priceMinor = parseMajorToMinor(form.price);
  const openingStock = Number(form.onHand);
  const currentActor = () => {
    if (!user || user.uid !== userId) throw new Error("Account changed. Reopen product creation.");
    return user;
  };
  const create = useMutation({
    mutationFn: () => createVendorProduct(currentActor(), {
      shopId: selectedShop,
      categoryId: selectedCategory,
      name: form.name.trim(),
      slug: `${slug}-${Date.now().toString(36)}`,
      description: form.description.trim() || null,
      brand: form.brand.trim() || null,
      variants: [{ sku: form.sku.trim(), title: "Default", priceMinor: priceMinor!.toString(), currency: "BDT", onHand: openingStock }]
    }),
    onSuccess: () => router.replace("/admin/products")
  });
  const valid = Boolean(user && selectedShop && selectedCategory && form.name.trim().length >= 3 && form.sku.trim() && priceMinor !== null && priceMinor > 0n && Number.isInteger(openingStock) && openingStock >= 0);

  return <Screen eyebrow="ADMIN CATALOG" title="Add product" description="Create a marketplace product for a selected seller shop and category.">
    {shops.isLoading || categories.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
    <ModuleCard title="Marketplace placement" meta="Choose the seller shop and category before creating the listing.">
      <Text style={styles.label}>Seller shop</Text>
      <View style={styles.choices}>{shops.data?.data.map((shop) => <Choice active={selectedShop === shop.id} key={shop.id} label={shop.name} onPress={() => setForm({ ...form, shopId: shop.id })} />)}</View>
      <Text style={styles.label}>Category</Text>
      <View style={styles.choices}>{categories.data?.map((category) => <Choice active={selectedCategory === category.id} key={category.id} label={category.name} onPress={() => setForm({ ...form, categoryId: category.id })} />)}</View>
    </ModuleCard>
    <ModuleCard title="Product information">
      <Field label="Product name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
      <Field label="Brand" value={form.brand} onChangeText={(brand) => setForm({ ...form, brand })} />
      <Field label="Description" multiline value={form.description} onChangeText={(description) => setForm({ ...form, description })} />
    </ModuleCard>
    <ModuleCard title="Default variant">
      <View style={styles.row}><Field label="SKU" value={form.sku} onChangeText={(sku) => setForm({ ...form, sku })} /><Field label="Price (BDT)" value={form.price} onChangeText={(price) => setForm({ ...form, price })} /></View>
      <Field label="Opening stock" value={form.onHand} onChangeText={(onHand) => setForm({ ...form, onHand })} />
    </ModuleCard>
    {create.error ? <Text style={styles.error}>{create.error.message}</Text> : null}
    <View style={[styles.footer, compact && styles.footerCompact]}>
      <Pressable onPress={() => router.back()} style={[styles.secondary, compact && styles.footerButtonCompact]}><Text style={styles.secondaryText}>Cancel</Text></Pressable>
      <Pressable disabled={!valid || create.isPending} onPress={() => create.mutate()} style={[styles.primary, compact && styles.footerButtonCompact, (!valid || create.isPending) && styles.disabled]}><Text style={styles.primaryText}>{create.isPending ? "Creating…" : "Create product"}</Text></Pressable>
    </View>
  </Screen>;
}

function Choice({ active, label, onPress }: { active: boolean; label: string; onPress(): void }) { return <Pressable onPress={onPress} style={[styles.choice, active && styles.choiceActive]}><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text></Pressable>; }
function Field({ label, ...props }: { label: string; value: string; multiline?: boolean; onChangeText(value: string): void }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} placeholderTextColor={colors.muted} style={[styles.input, props.multiline && styles.multiline]} /></View>; }

const styles = StyleSheet.create({ label: { color: colors.text, fontSize: 11, fontWeight: "700" }, choices: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, choice: { alignItems: "center", borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: 12, paddingVertical: 7 }, choiceActive: { backgroundColor: colors.primary, borderColor: colors.primary }, choiceText: { color: colors.muted, fontSize: 10, fontWeight: "600" }, choiceTextActive: { color: colors.surface }, row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, field: { flex: 1, gap: 6, minWidth: 220 }, input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 46, paddingHorizontal: 12 }, multiline: { minHeight: 96, paddingTop: 12, textAlignVertical: "top" }, footer: { flexDirection: "row", gap: spacing.sm, justifyContent: "flex-end" }, footerCompact: { flexDirection: "column" }, footerButtonCompact: { width: "100%" }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 46, paddingHorizontal: spacing.lg }, primaryText: { color: colors.surface, fontWeight: "700" }, secondary: { alignItems: "center", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, justifyContent: "center", minHeight: 46, paddingHorizontal: spacing.lg }, secondaryText: { color: colors.text, fontWeight: "700" }, disabled: { opacity: .45 }, error: { color: colors.danger, fontWeight: "700" } });
