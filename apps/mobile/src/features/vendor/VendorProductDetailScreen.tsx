import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import type { User } from "@firebase/auth";
import { useRef } from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { formatMinor } from "../../ui/money";
import { useCurrentUser } from "../auth/use-current-user";
import { getCategories, getVendorProducts, submitVendorProduct, archiveVendorProduct } from "../catalog/catalog.api";
import { fallbackProductImage } from "../catalog/catalog.view-model";

export function VendorProductDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const user = useCurrentUser();
  const compact = useWindowDimensions().width < 620;
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;
  const cache = useQueryClient();
  const products = useQuery({ queryKey: ["vendor", "products", user?.uid], queryFn: () => getVendorProducts(user!), enabled: Boolean(user), retry: false });
  const categories = useQuery({ queryKey: ["catalog", "categories"], queryFn: getCategories });
  const product = products.data?.find((item) => item.id === id);
  const submit = useMutation({
    retry: false,
    mutationFn: (owner: User) => submitVendorProduct(owner, id),
    onSuccess: async (_data, owner) => {
      if (activeUid.current === owner.uid) await cache.invalidateQueries({ queryKey: ["vendor", "products", owner.uid] });
    }
  });
  const archive = useMutation({
    retry: false,
    mutationFn: ({ owner, version }: { owner: User; version: number }) => archiveVendorProduct(owner, id, { version, reason: "Seller removed this listing" }),
    onSuccess: async (_data, variables) => {
      if (activeUid.current === variables.owner.uid) {
        await cache.invalidateQueries({ queryKey: ["vendor", "products", variables.owner.uid] });
        router.replace("/vendor/products");
      }
    }
  });

  if (products.isLoading) return <Screen title="Product details"><ActivityIndicator color={colors.primary} /></Screen>;
  if (!product) return <Screen title="Product unavailable" description="This listing could not be found in your seller catalog."><Pressable onPress={() => router.replace("/vendor/products")} style={styles.primary}><Text style={styles.primaryText}>Back to products</Text></Pressable></Screen>;

  const category = categories.data?.find((item) => item.id === product.categoryId)?.name ?? "Unknown category";
  const editable = ["DRAFT", "REJECTED"].includes(product.status);
  const removable = !["SUBMITTED", "ARCHIVED"].includes(product.status);
  const stock = product.variants.reduce((sum, item) => sum + item.availableQuantity, 0);
  const checks = [
    { label: "Product name", pass: product.name.length >= 3 },
    { label: "Description", pass: Boolean(product.description?.trim()) },
    { label: "Brand", pass: Boolean(product.brand?.trim()) },
    { label: "Product media", pass: product.media.length > 0 },
    { label: "Sellable variant", pass: product.variants.some((item) => item.active && BigInt(item.price.amountMinor) > 0n) },
    { label: "Available stock", pass: stock > 0 }
  ];
  const confirmArchive = () => Alert.alert("Remove product?", "The listing will be archived and hidden from customers. Order history remains safe.", [
    { text: "Cancel", style: "cancel" },
    { text: "Remove product", style: "destructive", onPress: () => archive.mutate({ owner: user!, version: product.version }) }
  ]);

  return <Screen eyebrow="PRODUCT 360" title={product.name} description="Review listing quality, variants, stock and moderation status.">
    <View style={[styles.toolbar, compact && styles.toolbarCompact]}>
      <Pressable onPress={() => router.replace("/vendor/products")} style={styles.back}><Ionicons color={colors.primary} name="arrow-back" size={18} /><Text style={styles.backText}>All products</Text></Pressable>
      <View style={[styles.actions, compact && styles.actionsCompact]}>
        {removable ? <Pressable disabled={archive.isPending} onPress={confirmArchive} style={[styles.outline, compact && styles.actionCompact]}><Ionicons color={colors.danger} name="trash-outline" size={17} /><Text style={styles.outlineText}>{archive.isPending ? "Removing…" : "Remove product"}</Text></Pressable> : null}
        {editable ? <Pressable onPress={() => router.push(`/vendor/products/edit/${id}` as never)} style={[styles.outline, compact && styles.actionCompact]}><Ionicons color={colors.primary} name="create-outline" size={17} /><Text style={styles.outlineText}>Edit product</Text></Pressable> : null}
        {editable ? <Pressable disabled={submit.isPending} onPress={() => submit.mutate(user!)} style={[styles.primary, compact && styles.actionCompact]}><Text style={styles.primaryText}>{submit.isPending ? "Submitting…" : "Submit for approval"}</Text></Pressable> : null}
      </View>
    </View>

    <View style={[styles.layout, compact && styles.layoutCompact]}>
      <View style={[styles.media, compact && styles.mediaCompact]}>
        <Image source={{ uri: product.media[0]?.url || product.thumbnailUrl || fallbackProductImage }} style={styles.image} />
        {!product.media.length ? <View style={styles.mediaNotice}><Ionicons color={colors.warning} name="image-outline" size={17} /><Text style={styles.mediaNoticeText}>No product media uploaded</Text></View> : null}
      </View>
      <View style={[styles.summary, compact && styles.summaryCompact]}>
        <View style={styles.statusRow}><Text style={styles.status}>{product.status}</Text><Text style={styles.version}>VERSION {product.version}</Text></View>
        <Text style={[styles.name, compact && styles.nameCompact]}>{product.name}</Text>
        <Text style={styles.meta}>{product.brand || "No brand"} · {category}</Text>
        <Text style={styles.price}>{formatMinor(product.minimumPrice.amountMinor)}</Text>
        <Text style={styles.description}>{product.description || "No product description has been added."}</Text>
        <View style={styles.summaryStats}><Stat label="Variants" value={String(product.variants.length)} /><Stat label="Available" value={String(stock)} /><Stat label="Reviews" value={String(product.reviewCount)} /><Stat label="Rating" value={product.rating.toFixed(1)} /></View>
      </View>
    </View>

    <View style={[styles.twoColumns, compact && styles.twoColumnsCompact]}>
      <ModuleCard title="Listing quality" meta={`${checks.filter((item) => item.pass).length}/${checks.length} checks passed`}>
        {checks.map((check) => <View key={check.label} style={styles.check}><Ionicons color={check.pass ? colors.success : colors.warning} name={check.pass ? "checkmark-circle" : "alert-circle"} size={20} /><Text style={styles.checkLabel}>{check.label}</Text><Text style={[styles.checkState, check.pass && styles.checkPass]}>{check.pass ? "READY" : "NEEDS ATTENTION"}</Text></View>)}
      </ModuleCard>
      <ModuleCard title="Moderation timeline" meta="Listing status and publication lifecycle"><Timeline active label="Draft created" /><Timeline active={product.status !== "DRAFT"} label="Submitted for review" /><Timeline active={product.status === "APPROVED"} label="Approved and published" /><Timeline active={product.status === "REJECTED"} danger label="Changes requested" /></ModuleCard>
    </View>

    <ModuleCard title="Variants" meta="Pricing and current sellable stock">
      {product.variants.map((variant) => <View key={variant.id} style={[styles.variant, compact && styles.variantCompact]}><View style={styles.variantIcon}><Ionicons color={colors.primary} name="pricetag-outline" size={20} /></View><View style={styles.flex}><Text style={styles.variantName}>{variant.title}</Text><Text style={styles.variantMeta}>{variant.sku} · Version {variant.version}</Text></View><View style={compact && styles.variantPriceBlockCompact}><Text style={styles.variantPrice}>{formatMinor(variant.price.amountMinor)}</Text><Text style={styles.variantStock}>{variant.availableQuantity} available</Text></View></View>)}
      <Pressable onPress={() => router.push("/vendor/inventory")} style={styles.inventory}><Text style={styles.inventoryText}>Open inventory management →</Text></Pressable>
    </ModuleCard>
    {submit.error || archive.error ? <Text accessibilityRole="alert" style={styles.error}>{(submit.error || archive.error)?.message}</Text> : null}
  </Screen>;
}

function Stat({ label, value }: { label: string; value: string }) { return <View style={styles.stat}><Text adjustsFontSizeToFit numberOfLines={1} style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
function Timeline({ active, danger, label }: { active?: boolean; danger?: boolean; label: string }) { return <View style={styles.timeline}><View style={[styles.timelineDot, active && styles.timelineActive, danger && active && styles.timelineDanger]} /><Text style={[styles.timelineLabel, active && styles.timelineLabelActive]}>{label}</Text></View>; }

const styles = StyleSheet.create({
  flex: { flex: 1 }, toolbar: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between" }, toolbarCompact: { alignItems: "stretch" }, back: { alignItems: "center", flexDirection: "row", gap: 6 }, backText: { color: colors.primary, fontWeight: "700" }, actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, actionsCompact: { width: "100%" }, actionCompact: { flex: 1, minWidth: "47%", paddingHorizontal: spacing.sm }, outline: { alignItems: "center", borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: 6, justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.md }, outlineText: { color: colors.primary, fontWeight: "700" }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.md }, primaryText: { color: colors.surface, fontWeight: "700" }, layout: { alignItems: "stretch", flexDirection: "row", flexWrap: "wrap", gap: spacing.lg }, layoutCompact: { flexDirection: "column", gap: spacing.md }, media: { backgroundColor: colors.surface, borderRadius: radius.xl, minWidth: 290, overflow: "hidden", width: "42%" }, mediaCompact: { minWidth: 0, width: "100%" }, image: { aspectRatio: 1.15, backgroundColor: colors.primarySoft, width: "100%" }, mediaNotice: { alignItems: "center", backgroundColor: colors.accentSoft, flexDirection: "row", gap: 6, padding: spacing.sm }, mediaNoticeText: { color: colors.warning, fontSize: 10, fontWeight: "600" }, summary: { backgroundColor: colors.surface, borderRadius: radius.xl, flex: 1, gap: spacing.md, minWidth: 300, padding: spacing.xl }, summaryCompact: { minWidth: 0, padding: spacing.lg, width: "100%" }, statusRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, status: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, color: colors.primary, fontSize: 9, fontWeight: "700", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 6 }, version: { color: colors.muted, fontSize: 9, fontWeight: "700" }, name: { color: colors.text, fontSize: 27, fontWeight: "700" }, nameCompact: { fontSize: 22 }, meta: { color: colors.muted }, price: { color: colors.primary, fontSize: 25, fontWeight: "700" }, description: { color: colors.text, lineHeight: 21 }, summaryStats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, stat: { backgroundColor: colors.primarySoft, borderRadius: radius.md, flex: 1, minWidth: 80, padding: spacing.sm }, statValue: { color: colors.text, fontSize: 16, fontWeight: "700" }, statLabel: { color: colors.muted, fontSize: 9, marginTop: 2 }, twoColumns: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, twoColumnsCompact: { flexDirection: "column" }, check: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.sm, minHeight: 46 }, checkLabel: { color: colors.text, flex: 1, fontWeight: "600" }, checkState: { color: colors.warning, fontSize: 8, fontWeight: "700" }, checkPass: { color: colors.success }, timeline: { alignItems: "center", flexDirection: "row", gap: spacing.sm, minHeight: 40 }, timelineDot: { backgroundColor: colors.border, borderRadius: radius.pill, height: 11, width: 11 }, timelineActive: { backgroundColor: colors.success }, timelineDanger: { backgroundColor: colors.danger }, timelineLabel: { color: colors.muted }, timelineLabelActive: { color: colors.text, fontWeight: "600" }, variant: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md }, variantCompact: { alignItems: "flex-start", flexWrap: "wrap" }, variantIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 42, justifyContent: "center", width: 42 }, variantName: { color: colors.text, fontWeight: "700" }, variantMeta: { color: colors.muted, fontSize: 10, marginTop: 3 }, variantPriceBlockCompact: { paddingLeft: 58, width: "100%" }, variantPrice: { color: colors.text, fontWeight: "700", textAlign: "right" }, variantStock: { color: colors.success, fontSize: 9, marginTop: 3, textAlign: "right" }, inventory: { alignItems: "center", minHeight: 44, paddingTop: spacing.md }, inventoryText: { color: colors.primary, fontWeight: "700" }, error: { color: colors.danger }
});
