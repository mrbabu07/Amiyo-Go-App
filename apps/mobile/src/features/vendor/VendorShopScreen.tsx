import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { getVendorWorkspace, updateVendorShop } from "./vendor.api";

export function VendorShopScreen() {
  const user = firebaseAuth?.currentUser ?? null;
  const cache = useQueryClient();
  const workspace = useQuery({ queryKey: ["vendor", "workspace"], queryFn: () => getVendorWorkspace(user!), enabled: Boolean(user) });
  const shop = workspace.data?.shops[0];
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  useEffect(() => { if (shop) { setName(shop.name); setDescription(shop.description ?? ""); } }, [shop]);
  const save = useMutation({ mutationFn: () => updateVendorShop(user!, shop!.id, { version: shop!.version, name, description: description.trim() || null }), onSuccess: () => cache.invalidateQueries({ queryKey: ["vendor", "workspace"] }) });

  return <Screen eyebrow="SELLER PROFILE" title="Shop settings" description="Control the customer-facing identity and status of your storefront.">
    {workspace.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
    {shop ? <><View style={styles.preview}><View style={styles.logo}><Ionicons color={colors.surface} name="storefront" size={30} /></View><View style={styles.flex}><Text style={styles.previewLabel}>STOREFRONT PREVIEW</Text><Text style={styles.previewTitle}>{name || shop.name}</Text><Text style={styles.previewMeta}>amiyo-go.com/shop/{shop.slug}</Text></View><Text style={styles.status}>{shop.status}</Text></View>
      <ModuleCard title="Shop profile" meta="Customers see this information on products, orders and your shop page."><Field label="Shop name" onChangeText={setName} placeholder="Your shop name" value={name} /><Field label="Shop description" multiline onChangeText={setDescription} placeholder="Describe your products, service and business" value={description} /><Text style={styles.count}>{description.length}/3000 characters</Text><Pressable disabled={save.isPending || name.trim().length < 3} onPress={() => save.mutate()} style={[styles.primary, (save.isPending || name.trim().length < 3) && styles.disabled]}>{save.isPending ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>Save shop profile</Text>}</Pressable>{save.isSuccess ? <Text style={styles.success}>Shop profile updated successfully.</Text> : null}{save.error ? <Text style={styles.error}>{save.error.message}</Text> : null}</ModuleCard>
      <ModuleCard title="Marketplace status" meta="Approval and moderation are controlled by Amiyo-Go."><Row icon="shield-checkmark-outline" label="Vendor account" value={workspace.data?.status ?? "UNKNOWN"} /><Row icon="eye-outline" label="Storefront" value={shop.status} /><Row icon="link-outline" label="Shop slug" value={shop.slug} /></ModuleCard></> : null}
    {workspace.error ? <Text style={styles.error}>{workspace.error.message}</Text> : null}
  </Screen>;
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) { const { label, ...input } = props; return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor={colors.muted} style={[styles.input, input.multiline && styles.multiline]} {...input} /></View>; }
function Row({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: string }) { return <View style={styles.row}><Ionicons color={colors.primary} name={icon} size={19} /><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>; }
const styles = StyleSheet.create({ flex: { flex: 1 }, preview: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", gap: spacing.md, padding: spacing.xl }, logo: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, height: 62, justifyContent: "center", width: 62 }, previewLabel: { color: "#7dd3fc", fontSize: 9, fontWeight: "700", letterSpacing: 1 }, previewTitle: { color: colors.surface, fontSize: 23, fontWeight: "700", marginTop: 4 }, previewMeta: { color: "#cbd5e1", fontSize: 11, marginTop: 4 }, status: { backgroundColor: "rgba(34,197,94,.18)", borderRadius: radius.pill, color: "#bbf7d0", fontSize: 9, fontWeight: "700", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 7 }, field: { gap: 6 }, label: { color: colors.text, fontSize: 12, fontWeight: "600" }, input: { backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 48, paddingHorizontal: 13 }, multiline: { minHeight: 120, paddingVertical: 12, textAlignVertical: "top" }, count: { color: colors.muted, fontSize: 10, textAlign: "right" }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, minHeight: 48, justifyContent: "center" }, primaryText: { color: colors.surface, fontWeight: "700" }, disabled: { opacity: .45 }, success: { color: colors.success, fontWeight: "600" }, error: { color: colors.danger }, row: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.sm, minHeight: 48 }, rowLabel: { color: colors.muted, flex: 1 }, rowValue: { color: colors.text, fontSize: 11, fontWeight: "700" } });
