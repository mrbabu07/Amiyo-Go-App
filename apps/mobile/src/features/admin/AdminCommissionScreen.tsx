import { Ionicons } from "@expo/vector-icons";
import type { CommissionRule, CommissionRuleInput } from "@amiyo/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ComponentProps } from "react";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { getCategories } from "../catalog/catalog.api";
import { createCommissionRule, endCommissionRule, getCommissionOptions, getCommissionRules, updateCommissionRule, type CommissionOption } from "./admin.api";

type Scope = CommissionRule["scope"];
type Option = CommissionOption;
type Form = { scope: Scope; vendorId: string; shopId: string; categoryId: string; productId: string; percentage: string; fixed: string; starts: string; ends: string };

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = (): Form => ({ scope: "GLOBAL", vendorId: "", shopId: "", categoryId: "", productId: "", percentage: "", fixed: "", starts: today(), ends: "" });
const scopeOptions: Array<{ value: Scope; label: string; copy: string; icon: ComponentProps<typeof Ionicons>["name"] }> = [
  { value: "GLOBAL", label: "Global", copy: "Fallback for every seller", icon: "globe-outline" },
  { value: "CATEGORY", label: "Category", copy: "Category-wide rate", icon: "grid-outline" },
  { value: "VENDOR", label: "Vendor", copy: "Seller-level offer", icon: "person-outline" },
  { value: "VENDOR_CATEGORY", label: "Vendor + Category", copy: "Seller category exception", icon: "layers-outline" },
  { value: "SHOP", label: "Shop", copy: "Default for new shop products", icon: "storefront-outline" },
  { value: "PRODUCT", label: "Product", copy: "Highest-priority override", icon: "cube-outline" }
];

function isoDate(value: string) { return new Date(`${value}T00:00:00.000Z`).toISOString(); }
function toInput(form: Form): CommissionRuleInput {
  return {
    vendorId: ["VENDOR", "VENDOR_CATEGORY"].includes(form.scope) ? form.vendorId : null,
    shopId: form.scope === "SHOP" ? form.shopId : null,
    categoryId: ["CATEGORY", "VENDOR_CATEGORY"].includes(form.scope) ? form.categoryId : null,
    productId: form.scope === "PRODUCT" ? form.productId : null,
    rateBps: Math.round(Number(form.percentage || 0) * 100),
    fixedMinor: String(Math.round(Number(form.fixed || 0) * 100)),
    currency: "BDT",
    effectiveFrom: isoDate(form.starts),
    effectiveTo: form.ends ? isoDate(form.ends) : null
  };
}

export function AdminCommissionScreen() {
  const user = firebaseAuth?.currentUser ?? null;
  const cache = useQueryClient();
  const [form, setForm] = useState<Form>(emptyForm);
  const [editing, setEditing] = useState<CommissionRule | null>(null);
  const rules = useQuery({ queryKey: ["admin", "commission-rules"], queryFn: () => getCommissionRules(user!), enabled: Boolean(user) });
  const options = useQuery({ queryKey: ["admin", "commission-options"], queryFn: () => getCommissionOptions(user!), enabled: Boolean(user), staleTime: 60_000 });
  const categories = useQuery({ queryKey: ["catalog", "categories"], queryFn: getCategories, staleTime: 5 * 60_000 });
  const vendorOptions = useMemo<Option[]>(() => options.data?.vendors ?? [], [options.data?.vendors]);
  const shopOptions = useMemo<Option[]>(() => options.data?.shops ?? [], [options.data?.shops]);
  const productOptions = useMemo<Option[]>(() => options.data?.products ?? [], [options.data?.products]);
  const categoryOptions = useMemo<Option[]>(() => (categories.data || []).map((category) => ({ id: category.id, label: category.name, detail: category.slug })), [categories.data]);
  const refresh = async () => cache.invalidateQueries({ queryKey: ["admin", "commission-rules"] });
  const save = useMutation({ mutationFn: async () => editing ? updateCommissionRule(user!, editing.id, { ...toInput(form), expectedVersion: editing.version }) : createCommissionRule(user!, toInput(form)), onSuccess: async () => { setEditing(null); setForm(emptyForm()); await refresh(); } });
  const end = useMutation({ mutationFn: (rule: CommissionRule) => endCommissionRule(user!, rule.id, rule.version), onSuccess: refresh });
  const needsVendor = ["VENDOR", "VENDOR_CATEGORY"].includes(form.scope);
  const needsShop = form.scope === "SHOP";
  const needsCategory = ["CATEGORY", "VENDOR_CATEGORY"].includes(form.scope);
  const needsProduct = form.scope === "PRODUCT";
  const percentage = Number(form.percentage || 0);
  const fixed = Number(form.fixed || 0);
  const startsAt = Date.parse(`${form.starts}T00:00:00.000Z`);
  const endsAt = form.ends ? Date.parse(`${form.ends}T00:00:00.000Z`) : null;
  const valid = Number.isFinite(startsAt) && (endsAt === null || (Number.isFinite(endsAt) && endsAt > startsAt)) && percentage >= 0 && percentage <= 50 && fixed >= 0 && (percentage > 0 || fixed > 0) && (!needsVendor || Boolean(form.vendorId)) && (!needsShop || Boolean(form.shopId)) && (!needsCategory || Boolean(form.categoryId)) && (!needsProduct || Boolean(form.productId));

  function edit(rule: CommissionRule) {
    setEditing(rule);
    setForm({ scope: rule.scope, vendorId: rule.vendorId || "", shopId: rule.shopId || "", categoryId: rule.categoryId || "", productId: rule.productId || "", percentage: String(rule.rateBps / 100), fixed: String(Number(rule.fixedMinor) / 100), starts: rule.effectiveFrom.slice(0, 10), ends: rule.effectiveTo?.slice(0, 10) || "" });
  }
  function cancel() { setEditing(null); setForm(emptyForm()); save.reset(); }
  function confirmEnd(rule: CommissionRule) { Alert.alert("End commission rule?", "New orders will stop using this rule immediately.", [{ text: "Cancel", style: "cancel" }, { text: "End rule", style: "destructive", onPress: () => end.mutate(rule) }]); }
  function chooseScope(scope: Scope) { setForm({ ...form, scope, vendorId: ["VENDOR", "VENDOR_CATEGORY"].includes(scope) ? form.vendorId : "", shopId: scope === "SHOP" ? form.shopId : "", categoryId: ["CATEGORY", "VENDOR_CATEGORY"].includes(scope) ? form.categoryId : "", productId: scope === "PRODUCT" ? form.productId : "" }); }

  return <Screen eyebrow="FINANCE CONTROL" title="Commission Rules" description="Set global, vendor, shop and product-wise commission rates.">
    <View style={styles.metrics}><Metric label="Active" value={rules.data?.filter((rule) => rule.status === "ACTIVE").length || 0} icon="flash-outline" /><Metric label="Product rates" value={rules.data?.filter((rule) => rule.scope === "PRODUCT").length || 0} icon="cube-outline" /><Metric label="Shop rates" value={rules.data?.filter((rule) => rule.scope === "SHOP").length || 0} icon="storefront-outline" /></View>
    <View style={styles.layout}><View style={styles.formCard}><View style={styles.cardHeading}><View><Text style={styles.eyebrow}>{editing ? "EDIT RULE" : "NEW RULE"}</Text><Text style={styles.cardTitle}>{editing ? "Update commission" : "Create commission"}</Text></View>{editing ? <Pressable onPress={cancel} style={styles.close}><Ionicons color={colors.muted} name="close" size={20} /></Pressable> : null}</View>
      <Text style={styles.label}>Rule scope</Text><View style={styles.scopes}>{scopeOptions.map((option) => <Pressable key={option.value} onPress={() => chooseScope(option.value)} style={[styles.scope, form.scope === option.value && styles.scopeActive]}><Ionicons color={form.scope === option.value ? "#fff" : colors.primary} name={option.icon} size={18} /><Text style={[styles.scopeLabel, form.scope === option.value && styles.scopeLabelActive]}>{option.label}</Text><Text style={[styles.scopeCopy, form.scope === option.value && styles.scopeCopyActive]}>{option.copy}</Text></Pressable>)}</View>
      {needsVendor ? <OptionSelect label="Vendor" onChange={(vendorId) => setForm({ ...form, vendorId })} options={vendorOptions} placeholder="Select vendor" value={form.vendorId} /> : null}
      {needsShop ? <OptionSelect label="Vendor shop" onChange={(shopId) => setForm({ ...form, shopId })} options={shopOptions} placeholder="Select shop" value={form.shopId} /> : null}
      {needsCategory ? <OptionSelect label="Category" onChange={(categoryId) => setForm({ ...form, categoryId })} options={categoryOptions} placeholder="Select category" value={form.categoryId} /> : null}
      {needsProduct ? <OptionSelect label="Product" onChange={(productId) => setForm({ ...form, productId })} options={productOptions} placeholder="Select product" value={form.productId} /> : null}
      <View style={styles.fields}><Field keyboardType="decimal-pad" label="Commission %" onChangeText={(percentage) => setForm({ ...form, percentage })} placeholder="e.g. 2.5" suffix="%" value={form.percentage} /><Field keyboardType="decimal-pad" label="Fixed fee" onChangeText={(fixed) => setForm({ ...form, fixed })} placeholder="e.g. 0" prefix="Tk" value={form.fixed} /></View>
      <View style={styles.fields}><Field label="Starts (YYYY-MM-DD)" onChangeText={(starts) => setForm({ ...form, starts })} placeholder="2026-08-18" value={form.starts} /><Field label="Ends (optional)" onChangeText={(ends) => setForm({ ...form, ends })} placeholder="No end date" value={form.ends} /></View>
      <View style={styles.note}><Ionicons color={colors.primary} name="information-circle-outline" size={20} /><Text style={styles.noteText}>Priority: Product > Shop > Vendor + Category > Vendor > Category > Global. New products use the shop rate until admin sets a product override.</Text></View>
      {save.error ? <Text style={styles.error}>{save.error.message}</Text> : null}<Pressable disabled={!valid || save.isPending} onPress={() => save.mutate()} style={[styles.primary, (!valid || save.isPending) && styles.disabled]}>{save.isPending ? <ActivityIndicator color="#fff" /> : <><Ionicons color="#fff" name={editing ? "save-outline" : "add-circle-outline"} size={19} /><Text style={styles.primaryText}>{editing ? "Save changes" : "Create rule"}</Text></>}</Pressable>
    </View><View style={styles.listCard}><View style={styles.listHeading}><View><Text style={styles.eyebrow}>RULE REGISTER</Text><Text style={styles.cardTitle}>Configured commissions</Text></View><Pressable onPress={() => rules.refetch()} style={styles.refresh}><Ionicons color={colors.primary} name="refresh" size={19} /></Pressable></View>
      {rules.isLoading ? <ActivityIndicator color={colors.primary} /> : null}{rules.error ? <Text style={styles.error}>{rules.error.message}</Text> : null}
      <View style={styles.rules}>{rules.data?.map((rule) => <RuleCard key={rule.id} onEdit={() => edit(rule)} onEnd={() => confirmEnd(rule)} rule={rule} />)}{!rules.isLoading && !rules.data?.length ? <View style={styles.empty}><Ionicons color="#94a3b8" name="calculator-outline" size={38} /><Text style={styles.emptyTitle}>No commission rules</Text><Text style={styles.muted}>Create a global rule to start automatic commission calculation.</Text></View> : null}</View>
    </View></View>
  </Screen>;
}

function RuleCard({ onEdit, onEnd, rule }: { onEdit(): void; onEnd(): void; rule: CommissionRule }) {
  const title = rule.productName || rule.shopName || rule.vendorName || "All vendors";
  const icon = rule.scope === "GLOBAL" ? "globe-outline" : rule.scope === "CATEGORY" ? "grid-outline" : rule.scope === "PRODUCT" ? "cube-outline" : "storefront-outline";
  return <View style={styles.rule}><View style={styles.ruleTop}><View style={styles.ruleIdentity}><View style={styles.ruleIcon}><Ionicons color={colors.primary} name={icon as never} size={20} /></View><View style={styles.ruleCopy}><Text style={styles.ruleTitle}>{title}{rule.categoryName ? ` · ${rule.categoryName}` : ""}</Text><Text style={styles.ruleMeta}>{rule.scope.replaceAll("_", " ")} · v{rule.version}</Text></View></View><Status value={rule.status} /></View><View style={styles.feeRow}><Text style={styles.fee}>{rule.rateBps / 100}%</Text>{BigInt(rule.fixedMinor) > 0n ? <Text style={styles.fixed}>+ Tk {(Number(rule.fixedMinor) / 100).toLocaleString("en-BD")}</Text> : null}</View><Text style={styles.period}>{new Date(rule.effectiveFrom).toLocaleDateString("en-BD")} -> {rule.effectiveTo ? new Date(rule.effectiveTo).toLocaleDateString("en-BD") : "No end date"}</Text><View style={styles.actions}><Pressable onPress={onEdit} style={styles.action}><Ionicons color={colors.primary} name="create-outline" size={16} /><Text style={styles.actionText}>Edit</Text></Pressable>{rule.status !== "ENDED" ? <Pressable onPress={onEnd} style={[styles.action, styles.endAction]}><Ionicons color={colors.danger} name="stop-circle-outline" size={16} /><Text style={styles.endText}>End</Text></Pressable> : null}</View></View>;
}

function Metric({ icon, label, value }: { icon: string; label: string; value: number }) { return <View style={styles.metric}><View style={styles.metricIcon}><Ionicons color={colors.primary} name={icon as never} size={20} /></View><View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View></View>; }
function Status({ value }: { value: CommissionRule["status"] }) { return <Text style={[styles.status, value === "ACTIVE" && styles.active, value === "ENDED" && styles.ended]}>{value}</Text>; }
function Field({ label, prefix, suffix, ...props }: ComponentProps<typeof TextInput> & { label: string; prefix?: string; suffix?: string }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><View style={styles.inputWrap}>{prefix ? <Text style={styles.affix}>{prefix}</Text> : null}<TextInput placeholderTextColor="#94a3b8" style={styles.input} {...props} />{suffix ? <Text style={styles.affix}>{suffix}</Text> : null}</View></View>; }
function OptionSelect({ label, onChange, options, placeholder, value }: { label: string; onChange(id: string): void; options: Option[]; placeholder: string; value: string }) { const [open, setOpen] = useState(false); const [search, setSearch] = useState(""); const selected = options.find((option) => option.id === value); const visible = options.filter((option) => `${option.label} ${option.detail || ""}`.toLowerCase().includes(search.trim().toLowerCase())); return <View style={styles.field}><Text style={styles.label}>{label}</Text><Pressable onPress={() => setOpen(true)} style={styles.select}><Text numberOfLines={1} style={[styles.selectText, !selected && styles.muted]}>{selected?.label || placeholder}</Text><Ionicons color={colors.muted} name="chevron-down" size={18} /></Pressable><Modal transparent visible={open} onRequestClose={() => setOpen(false)}><View style={styles.backdrop}><View style={styles.modal}><View style={styles.modalHeading}><Text style={styles.cardTitle}>{placeholder}</Text><Pressable onPress={() => setOpen(false)} style={styles.close}><Ionicons color={colors.text} name="close" size={20} /></Pressable></View><TextInput autoFocus onChangeText={setSearch} placeholder={`Search ${label.toLowerCase()}`} placeholderTextColor="#94a3b8" style={styles.modalSearch} value={search} /><ScrollView keyboardShouldPersistTaps="handled">{visible.map((option) => <Pressable key={option.id} onPress={() => { onChange(option.id); setOpen(false); setSearch(""); }} style={[styles.option, option.id === value && styles.optionActive]}><View style={styles.ruleCopy}><Text style={styles.optionLabel}>{option.label}</Text>{option.detail ? <Text style={styles.ruleMeta}>{option.detail}</Text> : null}</View>{option.id === value ? <Ionicons color={colors.primary} name="checkmark-circle" size={20} /> : null}</Pressable>)}</ScrollView></View></View></Modal></View>; }

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, metric: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flex: 1, flexDirection: "row", gap: spacing.sm, minWidth: 150, padding: spacing.md }, metricIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 42, justifyContent: "center", width: 42 }, metricValue: { color: colors.text, fontSize: 21, fontWeight: "900" }, metricLabel: { color: colors.muted, fontSize: 10 },
  layout: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.lg }, formCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flex: 1, gap: spacing.md, minWidth: 300, padding: spacing.lg }, listCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flex: 1.2, gap: spacing.md, minWidth: 300, padding: spacing.lg }, cardHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, listHeading: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingBottom: spacing.md },
  eyebrow: { color: colors.primary, fontSize: 9, fontWeight: "900", letterSpacing: 1 }, cardTitle: { color: colors.text, fontSize: 19, fontWeight: "900", marginTop: 3 }, close: { alignItems: "center", backgroundColor: colors.background, borderRadius: radius.pill, height: 38, justifyContent: "center", width: 38 },
  scopes: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, scope: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexGrow: 1, minWidth: 136, padding: spacing.sm }, scopeActive: { backgroundColor: colors.primary, borderColor: colors.primary }, scopeLabel: { color: colors.text, fontSize: 12, fontWeight: "900", marginTop: 4 }, scopeLabelActive: { color: "#fff" }, scopeCopy: { color: colors.muted, fontSize: 9, marginTop: 3 }, scopeCopyActive: { color: "#dbeafe" },
  fields: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, field: { flex: 1, gap: 6, minWidth: 190 }, label: { color: colors.text, fontSize: 11, fontWeight: "900" }, inputWrap: { alignItems: "center", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", minHeight: 46, paddingHorizontal: 12 }, input: { color: colors.text, flex: 1, minWidth: 0, outlineStyle: "none", paddingVertical: 10 } as never, affix: { color: colors.muted, fontSize: 11, fontWeight: "900", marginRight: 5 },
  select: { alignItems: "center", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", minHeight: 46, paddingHorizontal: 12 }, selectText: { color: colors.text, flex: 1 }, note: { alignItems: "flex-start", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.sm }, noteText: { color: colors.primaryDark, flex: 1, fontSize: 10, lineHeight: 16 },
  primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 48 }, primaryText: { color: "#fff", fontWeight: "900" }, disabled: { opacity: .5 }, error: { backgroundColor: "#fef2f2", borderRadius: radius.md, color: colors.danger, padding: spacing.sm }, refresh: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 40, justifyContent: "center", width: 40 },
  rules: { gap: spacing.sm }, rule: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, gap: spacing.sm, padding: spacing.md }, ruleTop: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }, ruleIdentity: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.sm }, ruleIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 40, justifyContent: "center", width: 40 }, ruleCopy: { flex: 1, minWidth: 0 }, ruleTitle: { color: colors.text, fontWeight: "900" }, ruleMeta: { color: colors.muted, fontSize: 9, marginTop: 2 }, status: { backgroundColor: "#fff7ed", borderRadius: radius.pill, color: colors.warning, fontSize: 8, fontWeight: "900", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 5 }, active: { backgroundColor: "#ecfdf5", color: colors.success }, ended: { backgroundColor: "#f1f5f9", color: colors.muted },
  feeRow: { alignItems: "baseline", flexDirection: "row", gap: spacing.sm }, fee: { color: colors.accent, fontSize: 24, fontWeight: "900" }, fixed: { color: colors.text, fontWeight: "900" }, period: { color: colors.muted, fontSize: 10 }, actions: { borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", gap: spacing.sm, paddingTop: spacing.sm }, action: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.sm, flexDirection: "row", gap: 5, paddingHorizontal: 10, paddingVertical: 8 }, actionText: { color: colors.primary, fontSize: 10, fontWeight: "900" }, endAction: { backgroundColor: "#fef2f2" }, endText: { color: colors.danger, fontSize: 10, fontWeight: "900" },
  empty: { alignItems: "center", gap: spacing.sm, padding: spacing.xl }, emptyTitle: { color: colors.text, fontWeight: "900" }, muted: { color: colors.muted }, backdrop: { alignItems: "center", backgroundColor: "rgba(15,23,42,.55)", flex: 1, justifyContent: "center", padding: spacing.md }, modal: { backgroundColor: colors.surface, borderRadius: radius.lg, maxHeight: "80%", maxWidth: 560, padding: spacing.lg, width: "100%" }, modalHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, modalSearch: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, marginVertical: spacing.md, minHeight: 46, paddingHorizontal: 12 }, option: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", minHeight: 54, paddingHorizontal: spacing.sm }, optionActive: { backgroundColor: colors.primarySoft }, optionLabel: { color: colors.text, fontWeight: "800" }
});
