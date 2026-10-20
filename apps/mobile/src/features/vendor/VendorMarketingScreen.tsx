import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import type { User } from "@firebase/auth";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { createVendorVoucher, getVendorVouchers } from "./vendor.api";

const tools = [
  ["/vendor/engagement", "Reviews and Q&A", "Read feedback and answer product questions", "star-outline"],
  ["/vendor/category-requests", "Category access", "Request approval for more categories", "git-pull-request-outline"],
  ["/vendor/messages", "Customer messages", "Continue marketplace conversations", "chatbubbles-outline"]
] as const;

const initialForm = { code: "", type: "PERCENT" as "PERCENT" | "FIXED", value: "10", days: "30" };

export function VendorMarketingScreen() {
  const router = useRouter();
  const user = useCurrentUser();
  const compact = useWindowDimensions().width < 620;
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;
  const cache = useQueryClient();
  const vouchers = useQuery({ queryKey: ["vendor", "vouchers", user?.uid], queryFn: () => getVendorVouchers(user!), enabled: Boolean(user) });
  const [form, setForm] = useState(initialForm);

  useEffect(() => { setForm(initialForm); }, [user?.uid]);

  const create = useMutation({
    retry: false,
    mutationFn: (owner: User) => {
      const startsAt = new Date();
      const days = Math.max(1, Number(form.days) || 30);
      return createVendorVoucher(owner, {
        code: form.code,
        discountType: form.type,
        value: Number(form.value),
        startsAt: startsAt.toISOString(),
        endsAt: new Date(startsAt.getTime() + days * 86_400_000).toISOString()
      });
    },
    onSuccess: async (_data, owner) => {
      if (activeUid.current !== owner.uid) return;
      setForm(initialForm);
      await cache.invalidateQueries({ queryKey: ["vendor", "vouchers", owner.uid] });
    }
  });
  const active = vouchers.data?.filter((item) => item.active && new Date(item.endsAt) > new Date()).length ?? 0;
  const discountValue = Number(form.value);
  const validDays = Number(form.days);
  const invalid = !user || create.isPending || form.code.length < 3 || !Number.isFinite(discountValue) || discountValue <= 0 || (form.type === "PERCENT" && discountValue > 100) || !Number.isInteger(validDays) || validDays < 1 || validDays > 365;
  const offerPreview = form.type === "PERCENT" ? `${Number.isFinite(discountValue) ? discountValue : 0}% off` : `৳${Number.isFinite(discountValue) ? discountValue : 0} off`;

  return <Screen eyebrow="SELLER GROWTH" title="Marketing center" description="Create seller-funded offers and manage customer engagement from one workspace.">
    <View style={[styles.hero, compact && styles.heroCompact]}>
      <View style={styles.heroIcon}><Ionicons color={colors.surface} name="megaphone" size={28} /></View>
      <View style={styles.flex}><Text style={styles.heroTitle}>Grow your store</Text><Text style={styles.heroMeta}>{active} active voucher{active === 1 ? "" : "s"} · {vouchers.data?.length ?? 0} total campaigns</Text></View>
    </View>

    <View style={styles.tools}>{tools.map(([href, title, copy, icon]) => <Pressable accessibilityRole="link" key={href} onPress={() => router.push(href)} style={({ pressed }) => [styles.tool, compact && styles.toolCompact, pressed && styles.pressed]}><View style={styles.toolIcon}><Ionicons color={colors.primary} name={icon} size={22} /></View><View style={styles.flex}><Text style={styles.toolTitle}>{title}</Text><Text style={styles.toolMeta}>{copy}</Text></View><Ionicons color={colors.muted} name="chevron-forward" size={18} /></Pressable>)}</View>

    <ModuleCard title="Create a voucher" meta="Offer a percentage or fixed-value discount for a limited period.">
      <View style={[styles.row, compact && styles.rowCompact]}>
        <Field compact={compact} label="Voucher code" onChangeText={(code) => setForm({ ...form, code: code.toUpperCase().replace(/[^A-Z0-9]/g, "") })} placeholder="SAVE10" value={form.code} />
        <Field compact={compact} keyboardType="numeric" label="Discount value" onChangeText={(value) => setForm({ ...form, value })} placeholder="10" value={form.value} />
        <Field compact={compact} keyboardType="numeric" label="Valid days" onChangeText={(days) => setForm({ ...form, days })} placeholder="30" value={form.days} />
      </View>
      <Text style={styles.label}>Discount type</Text>
      <View style={styles.types}>{(["PERCENT", "FIXED"] as const).map((type) => <Pressable key={type} onPress={() => setForm({ ...form, type })} style={[styles.type, compact && styles.typeCompact, form.type === type && styles.typeActive]}><Text style={[styles.typeText, form.type === type && styles.typeTextActive]}>{type === "PERCENT" ? "Percentage (%)" : "Fixed amount (৳)"}</Text></Pressable>)}</View>
      <View style={[styles.preview, compact && styles.previewCompact]}><View><Text style={styles.previewEyebrow}>CUSTOMER OFFER</Text><Text style={styles.previewValue}>{offerPreview}</Text></View><Text style={styles.previewMeta}>{Number.isInteger(validDays) && validDays > 0 ? `${validDays} days validity` : "Set a valid duration"}</Text></View>
      <Pressable disabled={invalid} onPress={() => user && create.mutate(user)} style={[styles.primary, compact && styles.primaryCompact, invalid && styles.disabled]}>{create.isPending ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>Create voucher</Text>}</Pressable>
      {create.error ? <Text accessibilityRole="alert" style={styles.error}>{create.error.message}</Text> : null}
    </ModuleCard>

    <Text style={styles.heading}>Your vouchers</Text>
    {vouchers.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
    <View style={styles.vouchers}>{vouchers.data?.map((item) => <View key={item.id} style={[styles.voucher, compact && styles.voucherCompact]}><View style={styles.ticket}><Ionicons color={colors.accent} name="ticket-outline" size={23} /></View><View style={styles.flex}><Text style={styles.code}>{item.code}</Text><Text style={styles.toolMeta}>{new Date(item.startsAt).toLocaleDateString("en-BD")} – {new Date(item.endsAt).toLocaleDateString("en-BD")}</Text></View><Text style={[styles.state, !item.active && styles.inactive]}>{item.active ? "ACTIVE" : "INACTIVE"}</Text></View>)}</View>
    {!vouchers.isLoading && !vouchers.data?.length ? <View style={styles.empty}><Ionicons color={colors.primary} name="ticket-outline" size={28} /><Text style={styles.toolTitle}>No vouchers created yet</Text><Text style={styles.toolMeta}>Create your first seller-funded offer above.</Text></View> : null}
  </Screen>;
}

function Field({ compact, label, ...input }: React.ComponentProps<typeof TextInput> & { compact: boolean; label: string }) {
  return <View style={[styles.field, compact && styles.fieldCompact]}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor={colors.muted} style={styles.input} {...input} /></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, hero: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", gap: spacing.md, padding: spacing.xl }, heroCompact: { alignItems: "flex-start", padding: spacing.lg }, heroIcon: { alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.lg, height: 56, justifyContent: "center", width: 56 }, heroTitle: { color: colors.surface, fontSize: 22, fontWeight: "700" }, heroMeta: { color: colors.border, lineHeight: 20, marginTop: 4 }, tools: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, tool: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, flex: 1, flexDirection: "row", gap: spacing.sm, minWidth: 280, padding: spacing.md }, toolCompact: { minWidth: 0, width: "100%" }, pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] }, toolIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 44, justifyContent: "center", width: 44 }, toolTitle: { color: colors.text, fontWeight: "700" }, toolMeta: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 3 }, row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, rowCompact: { flexDirection: "column" }, field: { flex: 1, gap: 6, minWidth: 180 }, fieldCompact: { minWidth: 0, width: "100%" }, label: { color: colors.text, fontSize: 11, fontWeight: "700" }, input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 46, paddingHorizontal: 12 }, types: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, type: { borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 9 }, typeCompact: { alignItems: "center", flex: 1 }, typeActive: { backgroundColor: colors.primary, borderColor: colors.primary }, typeText: { color: colors.muted, fontSize: 10, fontWeight: "700" }, typeTextActive: { color: colors.surface }, preview: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.lg, flexDirection: "row", justifyContent: "space-between", padding: spacing.md }, previewCompact: { alignItems: "flex-start", flexDirection: "column", gap: spacing.sm }, previewEyebrow: { color: colors.accent, fontSize: 9, fontWeight: "700", letterSpacing: 1 }, previewValue: { color: colors.surface, fontSize: 20, fontWeight: "700", marginTop: 3 }, previewMeta: { color: colors.border, fontSize: 11, fontWeight: "600" }, primary: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.xl }, primaryCompact: { alignSelf: "stretch" }, primaryText: { color: colors.surface, fontWeight: "700" }, disabled: { opacity: 0.45 }, heading: { color: colors.text, fontSize: 20, fontWeight: "700" }, vouchers: { gap: spacing.sm }, voucher: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, flexDirection: "row", gap: spacing.md, padding: spacing.md }, voucherCompact: { alignItems: "flex-start", flexWrap: "wrap" }, ticket: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.md, height: 44, justifyContent: "center", width: 44 }, code: { color: colors.text, fontSize: 16, fontWeight: "700", letterSpacing: 1 }, state: { backgroundColor: colors.accentSoft, borderRadius: radius.pill, color: colors.success, fontSize: 8, fontWeight: "700", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 6 }, inactive: { backgroundColor: colors.primarySoft, color: colors.muted }, empty: { alignItems: "center", borderColor: colors.border, borderRadius: radius.lg, borderStyle: "dashed", borderWidth: 1, gap: 5, padding: spacing.xl }, error: { color: colors.danger }
});
