import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getVendorWorkspace, updateVendorShop } from "./vendor.api";

type Decoration = { tagline: string; announcement: string; trustMessage: string };
const blank: Decoration = { tagline: "", announcement: "", trustMessage: "" };

function decorationFrom(settings: Record<string, unknown> | null): Decoration {
  const value = settings?.storefront;
  const storefront = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return { tagline: String(storefront.tagline || ""), announcement: String(storefront.announcement || ""), trustMessage: String(storefront.trustMessage || "") };
}

export function VendorShopDecorationScreen() {
  const compact = useWindowDimensions().width < 620;
  const user = useCurrentUser();
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;
  const cache = useQueryClient();
  const workspace = useQuery({ queryKey: ["vendor", "workspace", user?.uid], queryFn: () => getVendorWorkspace(user!), enabled: Boolean(user), retry: false });
  const shop = workspace.data?.shops[0];
  const [form, setForm] = useState<Decoration>(blank);
  useEffect(() => setForm(shop ? decorationFrom(shop.settings) : blank), [shop?.id, shop?.version, user?.uid]);

  const save = useMutation({
    retry: false,
    mutationFn: ({ owner, shopId, version }: { owner: User; shopId: string; version: number }) => updateVendorShop(owner, shopId, { version, settings: { ...(shop!.settings || {}), storefront: { tagline: form.tagline.trim() || null, announcement: form.announcement.trim() || null, trustMessage: form.trustMessage.trim() || null } } }),
    onSuccess: async (_data, variables) => {
      if (activeUid.current !== variables.owner.uid) return;
      await cache.invalidateQueries({ queryKey: ["vendor", "workspace", variables.owner.uid] });
    }
  });

  return <Screen eyebrow="STOREFRONT DESIGN" title="Shop decoration" description="Publish concise merchandising copy without changing the marketplace brand colors.">
    <View style={[styles.preview, compact && styles.previewCompact]}>
      <Text numberOfLines={compact ? 2 : 1} style={styles.previewLabel}>{form.announcement || "YOUR SHOP ANNOUNCEMENT"}</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.previewTitle}>{shop?.name || "Your shop"}</Text>
      <Text style={styles.previewTagline}>{form.tagline || "Add a short reason for customers to choose your store."}</Text>
      <View style={styles.trust}><Ionicons color={colors.accent} name="shield-checkmark" size={18} /><Text style={styles.trustText}>{form.trustMessage || "Verified marketplace seller"}</Text></View>
    </View>
    <ModuleCard title="Customer-facing copy" meta="Keep claims accurate. Amiyo-Go moderation may remove misleading content.">
      <Field label="Store tagline" maxLength={120} onChangeText={(tagline) => setForm({ ...form, tagline })} value={form.tagline} /><Counter value={form.tagline} max={120} />
      <Field label="Announcement bar" maxLength={180} onChangeText={(announcement) => setForm({ ...form, announcement })} value={form.announcement} /><Counter value={form.announcement} max={180} />
      <Field label="Trust or service message" maxLength={180} multiline onChangeText={(trustMessage) => setForm({ ...form, trustMessage })} value={form.trustMessage} /><Counter value={form.trustMessage} max={180} />
      <Pressable accessibilityRole="button" disabled={!shop || !user || save.isPending} onPress={() => user && shop && save.mutate({ owner: user, shopId: shop.id, version: shop.version })} style={[styles.button, (!shop || !user || save.isPending) && styles.disabled]}>{save.isPending ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.buttonText}>Publish decoration</Text>}</Pressable>
      {save.isSuccess ? <Text style={styles.success}>Storefront decoration published.</Text> : null}
      {save.error ? <Text accessibilityRole="alert" style={styles.error}>{save.error.message}</Text> : null}
    </ModuleCard>
  </Screen>;
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) { const { label, ...rest } = props; return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor={colors.muted} style={[styles.input, rest.multiline && styles.multiline]} {...rest} /></View>; }
function Counter({ value, max }: { value: string; max: number }) { return <Text style={styles.counter}>{value.length}/{max}</Text>; }

const styles = StyleSheet.create({
  preview: { backgroundColor: colors.navy, borderRadius: radius.xl, gap: spacing.sm, padding: spacing.xl }, previewCompact: { padding: spacing.lg },
  previewLabel: { alignSelf: "flex-start", backgroundColor: colors.primary, borderRadius: radius.pill, color: colors.surface, fontSize: 10, fontWeight: "700", overflow: "hidden", paddingHorizontal: 12, paddingVertical: 7 }, previewTitle: { color: colors.surface, fontSize: 28, fontWeight: "700", marginTop: spacing.sm }, previewTagline: { color: "#e2e8f0", fontSize: 14, lineHeight: 21 },
  trust: { alignItems: "center", flexDirection: "row", gap: 7, marginTop: spacing.sm }, trustText: { color: "#d9e6a7", flex: 1, fontSize: 11, fontWeight: "600" },
  field: { gap: 6 }, label: { color: colors.text, fontSize: 12, fontWeight: "600" }, input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 48, paddingHorizontal: 13 }, multiline: { minHeight: 84, paddingVertical: 12, textAlignVertical: "top" }, counter: { color: colors.muted, fontSize: 10, textAlign: "right" },
  button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 48 }, buttonText: { color: colors.surface, fontWeight: "700" }, disabled: { opacity: .45 }, success: { color: colors.success, fontWeight: "600" }, error: { color: colors.danger }
});
