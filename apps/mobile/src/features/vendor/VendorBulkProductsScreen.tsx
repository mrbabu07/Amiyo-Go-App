import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, Share, StyleSheet, Text, TextInput } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { exportVendorProducts, getCategories, importVendorProducts } from "../catalog/catalog.api";
import { getVendorWorkspace } from "./vendor.api";

const template = "name,slug,sku,variantTitle,priceMinor,compareAtMinor,stock,description,brand\nClassic T-Shirt,classic-t-shirt,TSHIRT-001,Default,129900,,25,Soft cotton t-shirt,Amiyo";

export function VendorBulkProductsScreen() {
  const user = firebaseAuth?.currentUser ?? null; const queryClient = useQueryClient(); const [csv, setCsv] = useState(template); const [exported, setExported] = useState("");
  const workspace = useQuery({ queryKey: ["vendor", "workspace"], queryFn: () => getVendorWorkspace(user!), enabled: Boolean(user) });
  const categories = useQuery({ queryKey: ["catalog", "categories"], queryFn: getCategories });
  const bulkImport = useMutation({ mutationFn: () => importVendorProducts(user!, { shopId: workspace.data!.shops[0]!.id, categoryId: categories.data![0]!.id, csv }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendor", "products"] }) });
  const bulkExport = useMutation({ mutationFn: () => exportVendorProducts(user!), onSuccess: async (content) => { setExported(content); if (Platform.OS === "web") { const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "amiyo-products.csv"; link.click(); URL.revokeObjectURL(url); } else await Share.share({ title: "Amiyo product export", message: content }); } });
  const ready = Boolean(workspace.data?.shops[0] && categories.data?.[0]);
  return <Screen eyebrow="SELLER CATALOG" title="Bulk product import/export" description="Create up to 100 draft products in one validated transaction or export the current catalog as CSV.">
    <ModuleCard title="CSV import" meta={ready ? `${workspace.data!.shops[0]!.name} · ${categories.data![0]!.name}` : "Loading shop and category…"}>
      <Text style={styles.help}>Required columns: name, slug, sku, priceMinor, stock. Prices use minor units: ৳1,299 = 129900.</Text>
      <TextInput multiline onChangeText={setCsv} style={styles.editor} value={csv} />
      {bulkImport.error ? <Text style={styles.error}>{bulkImport.error.message}</Text> : null}
      {bulkImport.data ? <Text style={styles.success}>{bulkImport.data.created} draft products imported successfully.</Text> : null}
      <Pressable disabled={!ready || bulkImport.isPending} onPress={() => bulkImport.mutate()} style={styles.primary}>{bulkImport.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Validate and import CSV</Text>}</Pressable>
    </ModuleCard>
    <ModuleCard title="Catalog export" meta="Includes every product variant and current opening stock.">
      {bulkExport.error ? <Text style={styles.error}>{bulkExport.error.message}</Text> : null}
      <Pressable disabled={bulkExport.isPending} onPress={() => bulkExport.mutate()} style={styles.secondary}><Text style={styles.secondaryText}>{bulkExport.isPending ? "Preparing…" : Platform.OS === "web" ? "Download products CSV" : "Share products CSV"}</Text></Pressable>
      {exported ? <Text selectable numberOfLines={8} style={styles.preview}>{exported}</Text> : null}
    </ModuleCard>
  </Screen>;
}

const styles = StyleSheet.create({ help: { color: colors.muted, fontSize: 12, lineHeight: 18 }, editor: { backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, fontFamily: Platform.select({ web: "monospace", default: undefined }), minHeight: 220, padding: spacing.md, textAlignVertical: "top" }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 46 }, primaryText: { color: "#fff", fontWeight: "700" }, secondary: { alignItems: "center", borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, justifyContent: "center", minHeight: 46 }, secondaryText: { color: colors.primary, fontWeight: "700" }, preview: { color: colors.muted, fontFamily: Platform.select({ web: "monospace", default: undefined }), fontSize: 11 }, error: { color: colors.danger }, success: { color: colors.success, fontWeight: "600" } });
