import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Platform, Pressable, Share, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { exportVendorProducts, getCategories, importVendorProducts } from "../catalog/catalog.api";
import { getVendorWorkspace } from "./vendor.api";
import { ProductCategorySelect } from "./components/ProductCategorySelect";

const template = "name,slug,sku,variantTitle,priceMinor,compareAtMinor,stock,description,brand\nClassic T-Shirt,classic-t-shirt,TSHIRT-001,Default,129900,,25,Soft cotton t-shirt,Amiyo";

export function VendorBulkProductsScreen() {
  const compact = useWindowDimensions().width < 620;
  const user = useCurrentUser(); const activeUid = useRef(user?.uid); activeUid.current = user?.uid; const queryClient = useQueryClient(); const [csv, setCsv] = useState(template); const [exported, setExported] = useState(""); const [shopId, setShopId] = useState(""); const [categoryId, setCategoryId] = useState("");
  const workspace = useQuery({ queryKey: ["vendor", "workspace", user?.uid], queryFn: () => getVendorWorkspace(user!), enabled: Boolean(user) });
  const categories = useQuery({ queryKey: ["catalog", "categories"], queryFn: getCategories });
  useEffect(() => { setCsv(template); setExported(""); setShopId(""); setCategoryId(""); }, [user?.uid]);
  useEffect(() => { if (workspace.data?.shops.length === 1) setShopId(workspace.data.shops[0]!.id); }, [workspace.data?.shops]);
  const bulkImport = useMutation({ retry: false, mutationFn: (owner: User) => importVendorProducts(owner, { shopId, categoryId, csv }), onSuccess: async (_data, owner) => { if (activeUid.current !== owner.uid) return; await queryClient.invalidateQueries({ queryKey: ["vendor", "products", owner.uid] }); } });
  const bulkExport = useMutation({ retry: false, mutationFn: (owner: User) => exportVendorProducts(owner), onSuccess: async (content, owner) => { if (activeUid.current !== owner.uid) return; setExported(content); if (Platform.OS === "web") { const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "amiyo-products.csv"; link.click(); URL.revokeObjectURL(url); } else await Share.share({ title: "Amiyo product export", message: content }); } });
  const rowCount = Math.max(0, csv.trim().split(/\r?\n/).filter(Boolean).length - 1);
  const ready = Boolean(shopId && categoryId && rowCount > 0 && rowCount <= 100);
  return <Screen eyebrow="SELLER CATALOG" title="Bulk product import/export" description="Create up to 100 draft products in one validated transaction or export the current catalog as CSV.">
    <View style={[styles.guide, compact && styles.guideCompact]}>
      <GuideStep icon="download-outline" number="1" title="Use the template" copy="Keep the required column names unchanged." />
      <GuideStep icon="create-outline" number="2" title="Add your catalog" copy="One product variant per CSV row." />
      <GuideStep icon="shield-checkmark-outline" number="3" title="Validate & review" copy="Imported products remain drafts until submitted." />
    </View>
    <ModuleCard title="Import destination" meta="Choose exactly where every draft product will be created.">
      <Text style={bulkStyles.label}>Seller shop *</Text>
      <View style={bulkStyles.shops}>{workspace.data?.shops.map((shop) => <Pressable key={shop.id} onPress={() => setShopId(shop.id)} style={[bulkStyles.shop, shopId === shop.id && bulkStyles.shopActive]}><Ionicons color={shopId === shop.id ? colors.primary : colors.muted} name={shopId === shop.id ? "checkmark-circle" : "storefront-outline"} size={20} /><View style={bulkStyles.shopCopy}><Text style={[bulkStyles.shopName, shopId === shop.id && bulkStyles.shopNameActive]}>{shop.name}</Text><Text style={bulkStyles.shopMeta}>{shop.status.replaceAll("_", " ")}</Text></View></Pressable>)}</View>
      <ProductCategorySelect categories={categories.data ?? []} onChange={setCategoryId} value={categoryId} />
    </ModuleCard>
    <ModuleCard title="CSV import" meta={ready ? `${rowCount} product row${rowCount === 1 ? "" : "s"} ready for validation` : "Select a shop, category, and add 1–100 product rows."}>
      <Text style={styles.help}>Required columns: name, slug, sku, priceMinor, stock. Prices use minor units: ৳1,299 = 129900.</Text>
      <View style={bulkStyles.batchStatus}><Text style={bulkStyles.batchLabel}>BATCH READINESS</Text><Text style={[bulkStyles.batchCount, rowCount > 100 && styles.error]}>{rowCount}/100 rows</Text></View>
      <TextInput accessibilityLabel="Bulk product CSV" multiline onChangeText={setCsv} style={styles.editor} value={csv} />
      {bulkImport.error ? <Text style={styles.error}>{bulkImport.error.message}</Text> : null}
      {bulkImport.data ? <Text style={styles.success}>{bulkImport.data.created} draft products imported successfully.</Text> : null}
      <Pressable disabled={!user || !ready || bulkImport.isPending} onPress={() => user && bulkImport.mutate(user)} style={[styles.primary, (!user || !ready || bulkImport.isPending) && bulkStyles.disabled]}>{bulkImport.isPending ? <ActivityIndicator color={colors.background} /> : <Text style={styles.primaryText}>Validate and import CSV</Text>}</Pressable>
    </ModuleCard>
    <ModuleCard title="Catalog export" meta="Includes every product variant and current opening stock.">
      {bulkExport.error ? <Text style={styles.error}>{bulkExport.error.message}</Text> : null}
      <Pressable disabled={!user || bulkExport.isPending} onPress={() => user && bulkExport.mutate(user)} style={styles.secondary}><Text style={styles.secondaryText}>{bulkExport.isPending ? "Preparing…" : Platform.OS === "web" ? "Download products CSV" : "Share products CSV"}</Text></Pressable>
      {exported ? <Text selectable numberOfLines={8} style={styles.preview}>{exported}</Text> : null}
    </ModuleCard>
  </Screen>;
}

function GuideStep({ copy, icon, number, title }: { copy: string; icon: React.ComponentProps<typeof Ionicons>["name"]; number: string; title: string }) {
  return <View style={styles.guideStep}><View style={styles.guideIcon}><Ionicons color={colors.primary} name={icon} size={20} /><Text style={styles.guideNumber}>{number}</Text></View><View style={styles.guideCopy}><Text style={styles.guideTitle}>{title}</Text><Text style={styles.guideText}>{copy}</Text></View></View>;
}

const bulkStyles = StyleSheet.create({ label: { color: colors.text, fontSize: 12, fontWeight: "700" }, shops: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, shop: { alignItems: "center", backgroundColor: colors.background, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, minHeight: 54, minWidth: 190, padding: spacing.sm }, shopActive: { backgroundColor: colors.primarySoft }, shopCopy: { flex: 1, minWidth: 0 }, shopName: { color: colors.text, fontSize: 12, fontWeight: "600" }, shopNameActive: { color: colors.primary, fontWeight: "700" }, shopMeta: { color: colors.muted, fontSize: 9, marginTop: 2, textTransform: "capitalize" }, batchStatus: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.md, flexDirection: "row", justifyContent: "space-between", padding: spacing.sm }, batchLabel: { color: colors.navy, fontSize: 9, fontWeight: "700", letterSpacing: 1 }, batchCount: { color: colors.success, fontSize: 12, fontWeight: "700" }, disabled: { opacity: 0.45 } });

const styles = StyleSheet.create({ guide: { flexDirection: "row", gap: spacing.md }, guideCompact: { flexDirection: "column" }, guideStep: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, boxShadow: "0 8px 24px rgba(11,31,58,.06)", flex: 1, flexDirection: "row", gap: spacing.md, minHeight: 92, padding: spacing.md }, guideIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 46, justifyContent: "center", position: "relative", width: 46 }, guideNumber: { backgroundColor: colors.primary, borderColor: colors.surface, borderRadius: radius.pill, borderWidth: 2, bottom: -6, color: colors.surface, fontSize: 8, fontWeight: "700", minWidth: 19, overflow: "hidden", paddingVertical: 3, position: "absolute", right: -6, textAlign: "center" }, guideCopy: { flex: 1, minWidth: 0 }, guideTitle: { color: colors.text, fontSize: 13, fontWeight: "700" }, guideText: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 }, help: { color: colors.muted, fontSize: 12, lineHeight: 18 }, editor: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, fontFamily: Platform.select({ web: "monospace", default: undefined }), minHeight: 220, padding: spacing.md, textAlignVertical: "top" }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 46, width: "100%" }, primaryText: { color: "#fff", fontWeight: "700" }, secondary: { alignItems: "center", borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, justifyContent: "center", minHeight: 46, width: "100%" }, secondaryText: { color: colors.primary, fontWeight: "700" }, preview: { backgroundColor: colors.background, borderRadius: radius.md, color: colors.muted, fontFamily: Platform.select({ web: "monospace", default: undefined }), fontSize: 11, padding: spacing.md }, error: { color: colors.danger }, success: { color: colors.success, fontWeight: "600" } });
