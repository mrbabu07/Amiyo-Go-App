import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { firebaseAuth } from "../auth/firebase";
import { colors, radius, spacing } from "../../ui/tokens";
import { getAdminSearchDetail, searchAdminResources, type AdminSearchResult } from "./admin-search.api";

type RouteLink = { label: string; href: string; icon: string };

export function AdminGlobalSearch({ dark, onOpen, routes }: { dark: boolean; onOpen: (href: string) => void; routes: RouteLink[] }) {
  const user = firebaseAuth?.currentUser ?? null;
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState<AdminSearchResult | null>(null);
  const normalized = query.trim().toLocaleLowerCase();
  const routeResults = normalized ? routes.filter((route) => `${route.label} ${route.href}`.toLocaleLowerCase().includes(normalized)).slice(0, 5) : [];
  const resources = useQuery({
    queryKey: ["admin", "global-search", normalized],
    queryFn: () => searchAdminResources(user!, query.trim()),
    enabled: Boolean(user && normalized.length >= 2 && focused),
    staleTime: 15_000
  });
  const detail = useQuery({
    queryKey: ["admin", "global-search", selected?.type, selected?.id],
    queryFn: () => getAdminSearchDetail(user!, selected!),
    enabled: Boolean(user && selected && focused),
    staleTime: 30_000
  });
  const clear = () => { setQuery(""); setSelected(null); };
  const open = (href: string) => { clear(); setFocused(false); onOpen(href); };
  const submit = () => { const first = resources.data?.results[0]; if (first) setSelected(first); else if (routeResults[0]) open(routeResults[0].href); };
  const visible = focused && normalized.length > 0;

  return <View style={styles.wrap}>
    <View style={[styles.inputShell, dark && styles.darkInput, focused && styles.focused]}>
      <Ionicons color={dark ? "#94a3b8" : colors.muted} name="search-outline" size={18} />
      <TextInput accessibilityLabel="Search admin resources" autoCapitalize="none" onBlur={() => setTimeout(() => setFocused(false), 160)} onChangeText={(value) => { setQuery(value); setSelected(null); }} onFocus={() => setFocused(true)} onSubmitEditing={submit} placeholder="Search orders, products, vendors..." placeholderTextColor="#94a3b8" returnKeyType="search" style={[styles.input, dark && styles.darkText]} value={query} />
      {resources.isFetching ? <ActivityIndicator color={colors.primary} size="small" /> : query ? <Pressable accessibilityLabel="Clear admin search" onPress={clear}><Ionicons color="#94a3b8" name="close-circle" size={18} /></Pressable> : null}
    </View>
    {visible ? <View style={[styles.results, dark && styles.darkResults]}><ScrollView keyboardShouldPersistTaps="handled" style={styles.resultsScroll}>
      {selected ? <DetailView dark={dark} error={detail.error?.message} loading={detail.isLoading} onBack={() => setSelected(null)} onOpen={open} result={detail.data} /> : <>
        {normalized.length < 2 ? <Hint text="Type at least 2 characters to search live records." /> : null}
        {resources.error ? <Hint error text={resources.error.message} /> : null}
        {resources.data?.results.length ? <><Heading label={`Records (${resources.data.total})`} />{resources.data.results.map((result) => <ResourceRow dark={dark} key={`${result.type}-${result.id}`} onPress={() => setSelected(result)} result={result} />)}</> : null}
        {routeResults.length ? <><Heading label="Admin pages" />{routeResults.map((route) => <Pressable key={route.href} onPress={() => open(route.href)} style={[styles.row, dark && styles.darkRow]}><View style={styles.icon}><Ionicons color={colors.primary} name={route.icon as never} size={17} /></View><View style={styles.copy}><Text style={[styles.title, dark && styles.darkText]}>{route.label}</Text><Text style={styles.subtitle}>{route.href}</Text></View><Ionicons color="#94a3b8" name="arrow-forward" size={15} /></Pressable>)}</> : null}
        {normalized.length >= 2 && !resources.isLoading && !resources.error && !resources.data?.results.length && !routeResults.length ? <Hint text={`No result found for "${query.trim()}".`} /> : null}
      </>}
    </ScrollView></View> : null}
  </View>;
}

function ResourceRow({ dark, onPress, result }: { dark: boolean; onPress: () => void; result: AdminSearchResult }) {
  return <Pressable onPress={onPress} style={[styles.row, dark && styles.darkRow]}><View style={styles.typeIcon}><Ionicons color="#ffffff" name={typeIcon(result.type) as never} size={16} /></View><View style={styles.copy}><View style={styles.titleLine}><Text numberOfLines={1} style={[styles.title, styles.flex, dark && styles.darkText]}>{result.title}</Text><Text style={[styles.badge, result.badges[0]?.tone === "danger" && styles.dangerBadge, result.badges[0]?.tone === "success" && styles.successBadge]}>{result.type.toUpperCase()}</Text></View><Text numberOfLines={1} style={styles.subtitle}>{result.subtitle}</Text></View><Ionicons color="#94a3b8" name="chevron-forward" size={15} /></Pressable>;
}

function DetailView({ dark, error, loading, onBack, onOpen, result }: { dark: boolean; error?: string; loading: boolean; onBack: () => void; onOpen: (href: string) => void; result?: Awaited<ReturnType<typeof getAdminSearchDetail>> }) {
  return <View><View style={styles.detailHeader}><Pressable onPress={onBack} style={styles.back}><Ionicons color={colors.primary} name="arrow-back" size={18} /></Pressable><Text style={[styles.detailTitle, dark && styles.darkText]}>Search result</Text></View>{loading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : error ? <Hint error text={error} /> : result ? <><View style={styles.detailBody}><Text style={[styles.detailName, dark && styles.darkText]}>{result.title}</Text><Text style={styles.subtitle}>{result.subtitle}</Text>{result.sections.flatMap((section) => section.items).map((item) => <View key={item.label} style={styles.detailRow}><Text style={styles.detailLabel}>{item.label}</Text><Text numberOfLines={2} style={[styles.detailValue, dark && styles.darkText]}>{item.value}</Text></View>)}</View><Pressable onPress={() => onOpen(result.href)} style={styles.openButton}><Text style={styles.openText}>Open workspace</Text><Ionicons color="#ffffff" name="arrow-forward" size={16} /></Pressable></> : null}</View>;
}

function Heading({ label }: { label: string }) { return <Text style={styles.heading}>{label}</Text>; }
function Hint({ error = false, text }: { error?: boolean; text: string }) { return <View style={styles.hint}><Ionicons color={error ? colors.danger : "#94a3b8"} name={error ? "alert-circle-outline" : "search-outline"} size={18} /><Text style={[styles.hintText, error && styles.errorText]}>{text}</Text></View>; }
function typeIcon(type: AdminSearchResult["type"]) { return ({ order: "receipt-outline", vendor: "storefront-outline", product: "cube-outline", customer: "person-outline", return: "return-down-back-outline", support: "headset-outline" })[type]; }

const styles = StyleSheet.create({
  wrap: { flex: 1, maxWidth: 560, position: "relative", zIndex: 30 }, inputShell: { alignItems: "center", backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: 8, paddingHorizontal: 12 }, focused: { backgroundColor: colors.surface, borderColor: colors.primary }, input: { color: colors.text, flex: 1, fontSize: 13, height: 40, outlineStyle: "none" } as never, results: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, boxShadow: "0 12px 32px rgba(15,23,42,.18)", left: 0, overflow: "hidden", position: "absolute", right: 0, top: 46 }, resultsScroll: { maxHeight: 520 }, row: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: 10, minHeight: 58, paddingHorizontal: 12, paddingVertical: 8 }, icon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.sm, height: 34, justifyContent: "center", width: 34 }, typeIcon: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.sm, height: 34, justifyContent: "center", width: 34 }, copy: { flex: 1, minWidth: 0 }, titleLine: { alignItems: "center", flexDirection: "row", gap: 8 }, flex: { flex: 1 }, title: { color: colors.text, fontSize: 13, fontWeight: "900" }, subtitle: { color: colors.muted, fontSize: 10, marginTop: 2 }, badge: { backgroundColor: "#f1f5f9", borderRadius: 10, color: "#475569", fontSize: 8, fontWeight: "900", overflow: "hidden", paddingHorizontal: 7, paddingVertical: 3 }, successBadge: { backgroundColor: "#dcfce7", color: "#166534" }, dangerBadge: { backgroundColor: "#fee2e2", color: "#991b1b" }, heading: { backgroundColor: "#f8fafc", color: "#64748b", fontSize: 9, fontWeight: "900", letterSpacing: 1, paddingHorizontal: 12, paddingVertical: 7, textTransform: "uppercase" }, hint: { alignItems: "center", flexDirection: "row", gap: 8, padding: spacing.md }, hintText: { color: colors.muted, flex: 1, fontSize: 12 }, errorText: { color: colors.danger }, detailHeader: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: 8, padding: 10 }, back: { alignItems: "center", height: 32, justifyContent: "center", width: 32 }, detailTitle: { color: colors.text, fontSize: 13, fontWeight: "900" }, detailBody: { padding: spacing.md }, detailName: { color: colors.text, fontSize: 17, fontWeight: "900" }, detailRow: { alignItems: "flex-start", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: 12, paddingVertical: 8 }, detailLabel: { color: colors.muted, fontSize: 10, fontWeight: "800", width: 70 }, detailValue: { color: colors.text, flex: 1, fontSize: 11, fontWeight: "700", textAlign: "right" }, loader: { margin: spacing.lg }, openButton: { alignItems: "center", backgroundColor: colors.primary, flexDirection: "row", gap: 8, justifyContent: "center", margin: spacing.md, marginTop: 0, padding: 12, borderRadius: radius.md }, openText: { color: "#ffffff", fontSize: 12, fontWeight: "900" }, darkInput: { backgroundColor: "#0f172a", borderColor: "#334155" }, darkResults: { backgroundColor: "#0f172a", borderColor: "#334155" }, darkRow: { borderBottomColor: "#1e293b" }, darkText: { color: "#f8fafc" }
});
