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

const template = "name,slug,sku,variantTitle,priceMinor,compareAtMinor,stock,description,brand\nClassic T-Shirt,classic-t-shirt,TSHIRT-001,Default,129900,,25,Soft cotton t-shirt,Amiyo";

export function VendorBulkProductsScreen() {
  const compact = useWindowDimensions().width < 620;
  const user = useCurrentUser(); const activeUid = useRef(user?.uid); activeUid.current = user?.uid; const queryClient = useQueryClient(); const [csv, setCsv] = useState(template); const [exported, setExported] = useState("");
  const workspace = useQuery({ queryKey: ["vendor", "workspace", user?.uid], queryFn: () => getVendorWorkspace(user!), enabled: Boolean(user) });
  const categories = useQuery({ queryKey: ["catalog", "categories"], queryFn: getCategories });
  useEffect(() => { setCsv(template); setExported(""); }, [user?.uid]);
  const bulkImport = useMutation({ retry: false, mutationFn: (owner: User) => importVendorProducts(owner, { shopId: workspace.data!.shops[0]!.id, categoryId: categories.data![0]!.id, csv }), onSuccess: async (_data, owner) => { if (activeUid.current !== owner.uid) return; await queryClient.invalidateQueries({ queryKey: ["vendor", "products", owner.uid] }); } });
  const bulkExport = useMutation({ retry: false, mutationFn: (owner: User) => exportVendorProducts(owner), onSuccess: async (content, owner) => { if (activeUid.current !== owner.uid) return; setExported(content); if (Platform.OS === "web") { const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "amiyo-products.csv"; link.click(); URL.revokeObjectURL(url); } else await Share.share({ title: "Amiyo product export", message: content }); } });
  const ready = Boolean(workspace.data?.shops[0] && categories.data?.[0]);
  return <Screen eyebrow="SELLER CATALOG" title="Bulk product import/export" description="Create up to 100 draft products in one validated transaction or export the current catalog as CSV.">
    <View style={[styles.guide, compact && styles.guideCompact]}>
      <GuideStep icon="download-outline" number="1" title="Use the template" copy="Keep the required column names unchanged." />
      <GuideStep icon="create-outline" number="2" title="Add your catalog" copy="One product variant per CSV row." />
      <GuideStep icon="shield-checkmark-outline" number="3" title="Validate & review" copy="Imported products remain drafts until submitted." />
    </View>
    <ModuleCard title="CSV import" meta={ready ? `${workspace.data!.shops[0]!.name} · ${categories.data![0]!.name}` : "Loading shop and category…"}>
      <Text style={styles.help}>Required columns: name, slug, sku, priceMinor, stock. Prices use minor units: ৳1,299 = 129900.</Text>
      <TextInput multiline onChangeText={setCsv} style={styles.editor} value={csv} />
      {bulkImport.error ? <Text style={styles.error}>{bulkImport.error.message}</Text> : null}
      {bulkImport.data ? <Text style={styles.success}>{bulkImport.data.created} draft products imported successfully.</Text> : null}
      <Pressable disabled={!user || !ready || bulkImport.isPending} onPress={() => user && bulkImport.mutate(user)} style={styles.primary}>{bulkImport.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Validate and import CSV</Text>}</Pressable>
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

const styles = StyleSheet.create({ guide: { flexDirection: "row", gap: spacing.md }, guideCompact: { flexDirection: "column" }, guideStep: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, boxShadow: "0 8px 24px rgba(11,31,58,.06)", flex: 1, flexDirection: "row", gap: spacing.md, minHeight: 92, padding: spacing.md }, guideIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 46, justifyContent: "center", position: "relative", width: 46 }, guideNumber: { backgroundColor: colors.primary, borderColor: colors.surface, borderRadius: radius.pill, borderWidth: 2, bottom: -6, color: colors.surface, fontSize: 8, fontWeight: "700", minWidth: 19, overflow: "hidden", paddingVertical: 3, position: "absolute", right: -6, textAlign: "center" }, guideCopy: { flex: 1, minWidth: 0 }, guideTitle: { color: colors.text, fontSize: 13, fontWeight: "700" }, guideText: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 }, help: { color: colors.muted, fontSize: 12, lineHeight: 18 }, editor: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, fontFamily: Platform.select({ web: "monospace", default: undefined }), minHeight: 220, padding: spacing.md, textAlignVertical: "top" }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 46, width: "100%" }, primaryText: { color: "#fff", fontWeight: "700" }, secondary: { alignItems: "center", borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, justifyContent: "center", minHeight: 46, width: "100%" }, secondaryText: { color: colors.primary, fontWeight: "700" }, preview: { backgroundColor: colors.background, borderRadius: radius.md, color: colors.muted, fontFamily: Platform.select({ web: "monospace", default: undefined }), fontSize: 11, padding: spacing.md }, error: { color: colors.danger }, success: { color: colors.success, fontWeight: "600" } });
