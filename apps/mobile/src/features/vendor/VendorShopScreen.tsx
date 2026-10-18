import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import type { User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getVendorWorkspace, updateVendorShop } from "./vendor.api";

const tools = [
  { label: "Logo & cover", copy: "Upload storefront media", icon: "images-outline" as const, href: "/vendor/shop/media" },
  { label: "Decoration", copy: "Announcement and trust copy", icon: "color-palette-outline" as const, href: "/vendor/shop/decoration" },
  { label: "Pickup point", copy: "Courier origin details", icon: "location-outline" as const, href: "/vendor/shop/location" },
  { label: "Categories", copy: "Selling access requests", icon: "grid-outline" as const, href: "/vendor/shop/categories" }
];

export function VendorShopScreen() {
  const user = useCurrentUser();
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;
  const router = useRouter();
  const cache = useQueryClient();
  const compact = useWindowDimensions().width < 620;
  const workspace = useQuery({ queryKey: ["vendor", "workspace", user?.uid], queryFn: () => getVendorWorkspace(user!), enabled: Boolean(user), retry: false });
  const shop = workspace.data?.shops[0];
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const storefrontSettings = shop?.settings?.storefront && typeof shop.settings.storefront === "object" && !Array.isArray(shop.settings.storefront) ? shop.settings.storefront as Record<string, unknown> : {};
  const readinessChecks = shop ? [
    { label: "Shop profile", complete: shop.name.trim().length >= 3 && Boolean(shop.description?.trim()), href: "/vendor/shop/profile" },
    { label: "Logo", complete: Boolean(shop.logoUrl), href: "/vendor/shop/media" },
    { label: "Cover image", complete: Boolean(shop.bannerUrl), href: "/vendor/shop/media" },
    { label: "Store tagline", complete: Boolean(String(storefrontSettings.tagline || "").trim()), href: "/vendor/shop/decoration" }
  ] : [];
  const readiness = readinessChecks.length ? Math.round((readinessChecks.filter((item) => item.complete).length / readinessChecks.length) * 100) : 0;

  useEffect(() => {
    if (shop) {
      setName(shop.name);
      setDescription(shop.description ?? "");
    } else {
      setName("");
      setDescription("");
    }
  }, [shop?.id, shop?.version, user?.uid]);

  const save = useMutation({
    retry: false,
    mutationFn: ({ owner, shopId, version }: { owner: User; shopId: string; version: number }) => updateVendorShop(owner, shopId, { version, name: name.trim(), description: description.trim() || null }),
    onSuccess: async (_data, variables) => {
      if (activeUid.current === variables.owner.uid) await cache.invalidateQueries({ queryKey: ["vendor", "workspace", variables.owner.uid] });
    }
  });

  return <Screen eyebrow="SELLER PROFILE" title="Storefront manager" description="Manage the public identity, media, merchandising and fulfilment origin of your shop.">
    {workspace.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
    {shop ? <>
      <View style={[styles.preview, compact && styles.previewCompact]}>
        {shop.bannerUrl ? <Image resizeMode="cover" source={{ uri: shop.bannerUrl }} style={styles.banner} /> : null}
        <View style={styles.overlay} />
        {shop.logoUrl ? <Image source={{ uri: shop.logoUrl }} style={styles.logoImage} /> : <View style={styles.logo}><Ionicons color={colors.surface} name="storefront" size={30} /></View>}
        <View style={styles.flex}><Text style={styles.previewLabel}>STOREFRONT PREVIEW</Text><Text numberOfLines={2} style={[styles.previewTitle, compact && styles.previewTitleCompact]}>{name || shop.name}</Text><Text numberOfLines={1} style={styles.previewMeta}>amiyo-go.com/shop/{shop.slug}</Text></View>
        <View style={[styles.previewActions, compact && styles.previewActionsCompact]}><Text style={styles.status}>{shop.status}</Text><Pressable accessibilityRole="link" onPress={() => router.push(`/shop/${shop.slug}` as never)} style={styles.publicButton}><Ionicons color={colors.surface} name="open-outline" size={16} /><Text style={styles.publicButtonText}>View public shop</Text></Pressable></View>
      </View>
      <View style={[styles.readiness, compact && styles.readinessCompact]}><View style={styles.readinessSummary}><Text style={styles.readinessEyebrow}>STOREFRONT READINESS</Text><View style={styles.readinessTitleRow}><Text accessibilityRole="header" style={styles.readinessTitle}>{readiness}% complete</Text><Text style={[styles.readinessState, readiness === 100 && styles.readinessStateReady]}>{readiness === 100 ? "READY" : "SETUP"}</Text></View><View style={styles.track}><View style={[styles.fill, { width: `${readiness}%` }]} /></View><Text style={styles.readinessCopy}>{readiness === 100 ? "Your storefront has the essential brand content customers expect." : "Complete your shop identity before promoting the storefront."}</Text></View><View style={[styles.readinessList, compact && styles.readinessListCompact]}>{readinessChecks.map((item) => <Pressable key={item.label} onPress={() => router.push(item.href as never)} style={styles.readinessItem}><Ionicons color={item.complete ? colors.success : colors.warning} name={item.complete ? "checkmark-circle" : "ellipse-outline"} size={18} /><Text style={[styles.readinessItemText, item.complete && styles.readinessItemComplete]}>{item.label}</Text><Ionicons color={colors.muted} name="chevron-forward" size={15} /></Pressable>)}</View></View>
      <View style={styles.toolGrid}>{tools.map((tool) => <Pressable accessibilityRole="link" key={tool.href} onPress={() => router.push(tool.href as never)} style={({ pressed }) => [styles.tool, compact && styles.toolCompact, pressed && styles.pressed]}><View style={styles.toolIcon}><Ionicons color={colors.primary} name={tool.icon} size={22} /></View><View style={styles.flex}><Text style={styles.toolTitle}>{tool.label}</Text><Text style={styles.toolCopy}>{tool.copy}</Text></View><Ionicons color={colors.muted} name="chevron-forward" size={18} /></Pressable>)}</View>
      <ModuleCard title="Shop profile" meta="Customers see this information on products, orders and your shop page.">
        <Field label="Shop name" maxLength={160} onChangeText={setName} value={name} />
        <Field label="Shop description" maxLength={3000} multiline onChangeText={setDescription} value={description} />
        <Text style={styles.count}>{description.length}/3000 characters</Text>
        <Pressable disabled={save.isPending || name.trim().length < 3} onPress={() => save.mutate({ owner: user!, shopId: shop.id, version: shop.version })} style={[styles.primary, (save.isPending || name.trim().length < 3) && styles.disabled]}>{save.isPending ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>Save shop profile</Text>}</Pressable>
        {save.isSuccess ? <Text style={styles.success}>Shop profile updated successfully.</Text> : null}
        {save.error ? <Text accessibilityRole="alert" style={styles.error}>{save.error.message}</Text> : null}
      </ModuleCard>
      <ModuleCard title="Marketplace status" meta="Approval and moderation are controlled by Amiyo-Go.">
        <Row icon="shield-checkmark-outline" label="Vendor account" value={workspace.data?.status ?? "UNKNOWN"} />
        <Row icon="eye-outline" label="Storefront" value={shop.status} />
        <Row icon="link-outline" label="Shop slug" value={shop.slug} />
      </ModuleCard>
    </> : null}
    {workspace.error ? <Text accessibilityRole="alert" style={styles.error}>{workspace.error.message}</Text> : null}
  </Screen>;
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...input } = props;
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor={colors.muted} style={[styles.input, input.multiline && styles.multiline]} {...input} /></View>;
}

function Row({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: string }) {
  return <View style={styles.row}><Ionicons color={colors.primary} name={icon} size={19} /><Text style={styles.rowLabel}>{label}</Text><Text numberOfLines={1} style={styles.rowValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  preview: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", flexWrap: "wrap", gap: spacing.md, minHeight: 170, overflow: "hidden", padding: spacing.xl, position: "relative" },
  previewCompact: { alignItems: "flex-start", padding: spacing.lg },
  banner: { ...StyleSheet.absoluteFillObject },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(5,11,20,.68)" },
  logo: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.pill, height: 68, justifyContent: "center", width: 68 },
  logoImage: { backgroundColor: colors.surface, borderColor: colors.surface, borderRadius: radius.pill, borderWidth: 3, height: 68, width: 68 },
  previewLabel: { color: "#d9e6a7", fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  previewTitle: { color: colors.surface, fontSize: 23, fontWeight: "700", marginTop: 4 },
  previewTitleCompact: { fontSize: 20 },
  previewMeta: { color: "#cbd5e1", fontSize: 11, marginTop: 4 },
  status: { backgroundColor: "rgba(107,122,58,.35)", borderRadius: radius.pill, color: "#eef1e4", fontSize: 9, fontWeight: "700", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 7 },
  previewActions: { alignItems: "flex-end", gap: spacing.sm },
  previewActionsCompact: { alignItems: "flex-start", marginLeft: 84, width: "100%" },
  publicButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: 6, minHeight: 40, paddingHorizontal: 12 },
  publicButtonText: { color: colors.surface, fontSize: 10, fontWeight: "700" },
  readiness: { alignItems: "stretch", backgroundColor: colors.surface, borderRadius: radius.xl, boxShadow: "0 10px 28px rgba(11,31,58,.08)", flexDirection: "row", gap: spacing.xl, padding: spacing.lg },
  readinessCompact: { flexDirection: "column", gap: spacing.md },
  readinessSummary: { flex: 1.2, minWidth: 0 },
  readinessEyebrow: { color: colors.accent, fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  readinessTitleRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between", marginTop: 5 },
  readinessTitle: { color: colors.text, fontSize: 20, fontWeight: "700" },
  readinessState: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, color: colors.primary, fontSize: 8, fontWeight: "700", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 5 },
  readinessStateReady: { backgroundColor: colors.accentSoft, color: colors.success },
  track: { backgroundColor: colors.border, borderRadius: radius.pill, height: 7, marginTop: spacing.md, overflow: "hidden" },
  fill: { backgroundColor: colors.accent, borderRadius: radius.pill, height: 7 },
  readinessCopy: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: spacing.sm },
  readinessList: { flex: 1, minWidth: 260 },
  readinessListCompact: { minWidth: 0, width: "100%" },
  readinessItem: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.sm, minHeight: 42 },
  readinessItemText: { color: colors.muted, flex: 1, fontSize: 11, fontWeight: "600" },
  readinessItemComplete: { color: colors.text },
  toolGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tool: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, boxShadow: "0 7px 22px rgba(11,31,58,.06)", flexDirection: "row", gap: spacing.sm, minHeight: 78, padding: spacing.md, width: "48%" },
  toolCompact: { width: "100%" },
  toolIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 42, justifyContent: "center", width: 42 },
  toolTitle: { color: colors.text, fontWeight: "700" },
  toolCopy: { color: colors.muted, fontSize: 10, marginTop: 3 },
  pressed: { opacity: .78, transform: [{ scale: .99 }] },
  field: { gap: 6 },
  label: { color: colors.text, fontSize: 12, fontWeight: "600" },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 48, paddingHorizontal: 13 },
  multiline: { minHeight: 120, paddingVertical: 12, textAlignVertical: "top" },
  count: { color: colors.muted, fontSize: 10, textAlign: "right" },
  primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 48 },
  primaryText: { color: colors.surface, fontWeight: "700" },
  disabled: { opacity: .45 },
  success: { color: colors.success, fontWeight: "600" },
  error: { color: colors.danger },
  row: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.sm, minHeight: 48 },
  rowLabel: { color: colors.muted, flex: 1 },
  rowValue: { color: colors.text, flexShrink: 1, fontSize: 11, fontWeight: "700", maxWidth: "52%" }
});
