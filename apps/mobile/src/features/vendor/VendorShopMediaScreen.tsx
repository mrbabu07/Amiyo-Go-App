import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { pickAndUploadImage, waitForMediaUploadReady } from "../media/media.api";
import { getVendorWorkspace, updateVendorShop } from "./vendor.api";

type MediaKind = "logo" | "banner";

export function VendorShopMediaScreen() {
  const compact = useWindowDimensions().width < 620;
  const user = useCurrentUser();
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;
  const cache = useQueryClient();
  const workspace = useQuery({ queryKey: ["vendor", "workspace", user?.uid], queryFn: () => getVendorWorkspace(user!), enabled: Boolean(user), retry: false });
  const shop = workspace.data?.shops[0];
  const [uploading, setUploading] = useState<MediaKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setUploading(null); setError(null); }, [user?.uid]);

  const update = useMutation({
    retry: false,
    mutationFn: ({ owner, kind, uploadId }: { owner: User; kind: MediaKind; uploadId: string | null }) => updateVendorShop(owner, shop!.id, { version: shop!.version, ...(kind === "logo" ? { logoUploadId: uploadId } : { bannerUploadId: uploadId }) }),
    onSuccess: async (_data, variables) => {
      if (activeUid.current !== variables.owner.uid) return;
      await cache.invalidateQueries({ queryKey: ["vendor", "workspace", variables.owner.uid] });
    },
    onError: (failure, variables) => {
      if (activeUid.current === variables.owner.uid) setError(failure instanceof Error ? failure.message : "Could not update shop media");
    }
  });

  async function choose(kind: MediaKind) {
    if (!user || !shop || uploading || update.isPending) return;
    const owner = user;
    setUploading(kind);
    setError(null);
    try {
      const result = await pickAndUploadImage(owner, kind === "logo" ? "shop" : "banner");
      if (!result) return;
      await waitForMediaUploadReady(owner, result.id);
      if (activeUid.current === owner.uid) await update.mutateAsync({ owner, kind, uploadId: result.id });
    } catch (failure) {
      if (activeUid.current === owner.uid) setError(failure instanceof Error ? failure.message : "Could not upload this image");
    } finally {
      if (activeUid.current === owner.uid) setUploading(null);
    }
  }

  return <Screen eyebrow="SHOP BRANDING" title="Logo & cover media" description="Build a recognizable storefront with secure, customer-facing brand images.">
    {workspace.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
    {shop ? <>
      <View style={[styles.preview, compact && styles.previewCompact]}>
        {shop.bannerUrl ? <Image accessibilityLabel={`${shop.name} cover`} resizeMode="cover" source={{ uri: shop.bannerUrl }} style={styles.bannerImage} /> : null}
        <View style={styles.overlay} />
        {shop.logoUrl ? <Image accessibilityLabel={`${shop.name} logo`} source={{ uri: shop.logoUrl }} style={styles.logoImage} /> : <View style={styles.logoFallback}><Ionicons color={colors.surface} name="storefront" size={30} /></View>}
        <View style={styles.previewCopy}><Text style={styles.previewLabel}>LIVE STOREFRONT PREVIEW</Text><Text style={styles.previewTitle}>{shop.name}</Text><Text numberOfLines={compact ? 2 : 1} style={styles.previewMeta}>amiyo-go.com/shop/{shop.slug}</Text></View>
      </View>
      <ModuleCard title="Shop logo" meta="Use a square JPG, PNG or WebP. A clean logo remains readable on product and order cards."><MediaRow compact={compact} imageUrl={shop.logoUrl} kind="logo" loading={uploading === "logo"} onChoose={() => void choose("logo")} onClear={() => update.mutate({ owner: user!, kind: "logo", uploadId: null })} /></ModuleCard>
      <ModuleCard title="Store cover" meta="Use a wide image with the main subject near the center so it crops well on mobile."><MediaRow compact={compact} imageUrl={shop.bannerUrl} kind="banner" loading={uploading === "banner"} onChoose={() => void choose("banner")} onClear={() => update.mutate({ owner: user!, kind: "banner", uploadId: null })} /></ModuleCard>
      <View style={styles.notice}><Ionicons color={colors.accent} name="shield-checkmark-outline" size={20} /><Text style={styles.noticeText}>Images are security-checked and ownership-verified before they are attached to your shop.</Text></View>
    </> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {workspace.error ? <Text accessibilityRole="alert" style={styles.error}>{workspace.error.message}</Text> : null}
  </Screen>;
}

function MediaRow({ compact, imageUrl, kind, loading, onChoose, onClear }: { compact: boolean; imageUrl: string | null; kind: MediaKind; loading: boolean; onChoose: () => void; onClear: () => void }) {
  return <View style={[styles.mediaRow, compact && styles.mediaRowCompact]}>
    <View style={[styles.thumb, kind === "banner" && styles.bannerThumb, compact && styles.thumbCompact]}>{imageUrl ? <Image resizeMode="cover" source={{ uri: imageUrl }} style={styles.fill} /> : <Ionicons color={colors.muted} name={kind === "logo" ? "storefront-outline" : "image-outline"} size={28} />}</View>
    <View style={[styles.mediaCopy, compact && styles.mediaCopyCompact]}><Text style={styles.mediaTitle}>{kind === "logo" ? "Marketplace logo" : "Storefront cover"}</Text><Text style={styles.mediaMeta}>{imageUrl ? "Published and visible to customers" : "No image published yet"}</Text><View style={[styles.actions, compact && styles.actionsCompact]}><Pressable accessibilityRole="button" disabled={loading} onPress={onChoose} style={[styles.choose, compact && styles.actionCompact]}>{loading ? <ActivityIndicator color={colors.surface} size="small" /> : <Text style={styles.chooseText}>{imageUrl ? "Replace" : "Upload image"}</Text>}</Pressable>{imageUrl ? <Pressable accessibilityRole="button" disabled={loading} onPress={onClear} style={[styles.clear, compact && styles.actionCompact]}><Text style={styles.clearText}>Remove</Text></Pressable> : null}</View></View>
  </View>;
}

const styles = StyleSheet.create({
  preview: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", gap: spacing.md, minHeight: 190, overflow: "hidden", padding: spacing.xl, position: "relative" },
  previewCompact: { alignItems: "flex-start", flexDirection: "column", padding: spacing.lg },
  bannerImage: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }, overlay: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(5,11,20,.66)" },
  logoImage: { backgroundColor: colors.surface, borderColor: colors.surface, borderRadius: radius.pill, borderWidth: 3, height: 76, width: 76 },
  logoFallback: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.pill, height: 76, justifyContent: "center", width: 76 },
  previewCopy: { flex: 1, minWidth: 0 }, previewLabel: { color: "#d9e6a7", fontSize: 9, fontWeight: "700", letterSpacing: 1 }, previewTitle: { color: "#fff", fontSize: 25, fontWeight: "700", marginTop: 5 }, previewMeta: { color: "#e2e8f0", fontSize: 11, marginTop: 5 },
  mediaRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, mediaRowCompact: { alignItems: "stretch", flexDirection: "column" },
  thumb: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.lg, height: 92, justifyContent: "center", overflow: "hidden", width: 92 }, bannerThumb: { width: 150 }, thumbCompact: { width: "100%" }, fill: { height: "100%", width: "100%" },
  mediaCopy: { flex: 1, minWidth: 190 }, mediaCopyCompact: { minWidth: 0, width: "100%" }, mediaTitle: { color: colors.text, fontSize: 15, fontWeight: "700" }, mediaMeta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md }, actionsCompact: { flexDirection: "column" }, actionCompact: { width: "100%" },
  choose: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 42, minWidth: 110, paddingHorizontal: spacing.md }, chooseText: { color: colors.surface, fontSize: 11, fontWeight: "700" },
  clear: { alignItems: "center", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, justifyContent: "center", minHeight: 42, paddingHorizontal: spacing.md }, clearText: { color: colors.danger, fontSize: 11, fontWeight: "700" },
  notice: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.md }, noticeText: { color: colors.text, flex: 1, fontSize: 11, lineHeight: 18 }, error: { color: colors.danger }
});
