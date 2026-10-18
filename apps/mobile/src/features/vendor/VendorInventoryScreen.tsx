import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import type { User } from "firebase/auth";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { adjustVendorInventory, getVendorInventory } from "../catalog/catalog.api";

type InventoryItem = Awaited<ReturnType<typeof getVendorInventory>>[number];
type StockFilter = "all" | "low" | "out";
const validStock = (value: string) => { if (!/^\d+$/.test(value.trim())) return null; const parsed = Number(value); return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null; };

export function VendorInventoryScreen() {
  const compact = useWindowDimensions().width < 620;
  const user = useCurrentUser();
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<StockFilter>("all");
  const inventory = useQuery({ queryKey: ["vendor", "inventory", user?.uid], queryFn: () => getVendorInventory(user!), enabled: Boolean(user), retry: false });
  useEffect(() => { setValues({}); setFilter("all"); }, [user?.uid]);
  const adjust = useMutation({ retry: false, mutationFn: ({ item, owner, onHand }: { item: InventoryItem; owner: User; onHand: number }) => adjustVendorInventory(owner, item.variantId, { version: item.version, onHand, idempotencyKey: randomUUID(), reason: "Seller center stock adjustment" }), onSuccess: async (_data, variables) => { if (activeUid.current !== variables.owner.uid) return; setValues((current) => { const next = { ...current }; delete next[variables.item.id]; return next; }); await queryClient.invalidateQueries({ queryKey: ["vendor", "inventory", variables.owner.uid] }); } });

  const items = inventory.data ?? [];
  const lowStock = items.filter((item) => item.available > 0 && item.available <= item.reorderLevel).length;
  const outOfStock = items.filter((item) => item.available === 0).length;
  const totalAvailable = items.reduce((total, item) => total + item.available, 0);
  const filtered = useMemo(() => items.filter((item) => filter === "all" || (filter === "out" ? item.available === 0 : item.available > 0 && item.available <= item.reorderLevel)), [filter, items]);

  return <Screen eyebrow="SELLER CENTER" title="Inventory" description="Update authoritative stock while reservations remain protected.">
    <View style={[styles.hero, compact && styles.heroCompact]}><View style={styles.heroIcon}><Ionicons color={colors.primary} name="cube-outline" size={27} /></View><View style={styles.heroCopy}><Text style={styles.heroEyebrow}>STOCK CONTROL</Text><Text style={styles.heroTitle}>Keep every sellable unit accurate</Text><Text style={styles.heroText}>Available quantity excludes reserved units, so customer orders remain protected while you replenish stock.</Text></View><View style={styles.heroTotal}><Text style={styles.heroValue}>{totalAvailable}</Text><Text style={styles.heroLabel}>units available</Text></View></View>
    <View style={styles.metrics}><Metric label="Variants" value={items.length} /><Metric label="Low stock" value={lowStock} /><Metric label="Out of stock" value={outOfStock} /></View>
    <View style={styles.filters}>{(["all", "low", "out"] as StockFilter[]).map((item) => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.chip, filter === item && styles.activeChip]}><Text style={[styles.chipText, filter === item && styles.activeChipText]}>{item === "all" ? "All inventory" : item === "low" ? `Low stock (${lowStock})` : `Out of stock (${outOfStock})`}</Text></Pressable>)}</View>
    {inventory.isLoading ? <ActivityIndicator color={colors.primary} /> : null}{inventory.error || adjust.error ? <Text accessibilityRole="alert" style={styles.error}>{(inventory.error || adjust.error)?.message}</Text> : null}
    {filtered.map((item) => { const value = values[item.id] ?? String(item.onHand); const onHand = validStock(value); const saving = adjust.isPending && adjust.variables?.item.id === item.id; const needsStock = item.available <= item.reorderLevel; return <ModuleCard key={item.id} title={item.productName} meta={`${item.sku} · ${item.available} available · ${item.reserved} reserved`}><View style={[styles.stockStatus, needsStock && styles.stockStatusWarning]}><Ionicons color={needsStock ? colors.warning : colors.success} name={needsStock ? "alert-circle-outline" : "checkmark-circle-outline"} size={18} /><Text style={[styles.stockStatusText, needsStock && styles.warning]}>{item.available === 0 ? "Out of stock — replenish now" : needsStock ? `Low stock — reorder level ${item.reorderLevel}` : "Stock level is healthy"}</Text></View><View style={[styles.row, compact && styles.rowCompact]}><View style={styles.field}><Text style={styles.label}>On-hand quantity</Text><TextInput accessibilityLabel={`On-hand stock for ${item.productName}`} inputMode="numeric" onChangeText={(next) => setValues((current) => ({ ...current, [item.id]: next }))} style={[styles.input, compact && styles.inputCompact, onHand === null && styles.invalid]} value={value} /></View><Pressable accessibilityRole="button" disabled={!user || onHand === null || adjust.isPending} onPress={() => adjust.mutate({ item, owner: user!, onHand: onHand! })} style={[styles.button, compact && styles.buttonCompact, (!user || onHand === null || adjust.isPending) && styles.disabled]}>{saving ? <ActivityIndicator color={colors.background} /> : <Text style={styles.buttonText}>Update stock</Text>}</Pressable></View>{onHand === null ? <Text style={styles.error}>Enter a whole stock quantity of zero or more.</Text> : null}</ModuleCard>; })}
    {!inventory.isLoading && filtered.length === 0 ? <ModuleCard title={items.length ? "No matching stock alerts" : "No inventory yet"} meta={items.length ? "This inventory view is currently clear." : "Create and publish a product variant to manage its stock here."} /> : null}
  </Screen>;
}

function Metric({ label, value }: { label: string; value: number }) { return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }
const styles = StyleSheet.create({
  hero: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", gap: spacing.md, padding: spacing.lg }, heroCompact: { alignItems: "flex-start", flexDirection: "column" }, heroIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.lg, height: 52, justifyContent: "center", width: 52 }, heroCopy: { flex: 1, gap: 4 }, heroEyebrow: { color: colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 1.2 }, heroTitle: { color: colors.background, fontSize: 20, fontWeight: "700" }, heroText: { color: colors.background, fontSize: 12, lineHeight: 18, opacity: 0.8 }, heroTotal: { alignItems: "flex-end" }, heroValue: { color: colors.accent, fontSize: 28, fontWeight: "700" }, heroLabel: { color: colors.background, fontSize: 11, opacity: 0.75 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, metric: { backgroundColor: colors.primarySoft, borderRadius: radius.lg, flex: 1, minWidth: 105, padding: spacing.md }, metricValue: { color: colors.primary, fontSize: 24, fontWeight: "700" }, metricLabel: { color: colors.muted, fontSize: 12 }, filters: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, chip: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 9 }, activeChip: { backgroundColor: colors.primary }, chipText: { color: colors.text, fontSize: 12, fontWeight: "600" }, activeChipText: { color: colors.background }, stockStatus: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.sm }, stockStatusWarning: { backgroundColor: colors.primarySoft }, stockStatusText: { color: colors.success, flex: 1, fontSize: 12, fontWeight: "600" }, row: { alignItems: "flex-end", flexDirection: "row", gap: spacing.sm }, rowCompact: { alignItems: "stretch", flexDirection: "column" }, field: { flex: 1, gap: 5 }, label: { color: colors.muted, fontSize: 11, fontWeight: "700" }, input: { backgroundColor: colors.background, borderRadius: radius.md, color: colors.text, minHeight: 44, minWidth: 150, paddingHorizontal: 12 }, inputCompact: { minWidth: 0, width: "100%" }, invalid: { borderColor: colors.danger, borderWidth: 1 }, button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 44, minWidth: 130, paddingHorizontal: spacing.md }, buttonCompact: { width: "100%" }, buttonText: { color: colors.background, fontWeight: "700" }, disabled: { opacity: 0.5 }, warning: { color: colors.warning }, error: { color: colors.danger }
});
