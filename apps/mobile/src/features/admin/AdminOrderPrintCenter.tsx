import { Ionicons } from "@expo/vector-icons";
import type { AdminOrderDetail } from "@amiyo/contracts";
import type { User } from "@firebase/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { colors, radius, spacing } from "../../ui/tokens";
import { BatchDocuments } from "../orders/BatchDocuments";
import { batchDocumentLimit } from "../orders/batch-documents";

export function AdminOrderPrintCenter({ order, user }: { order: AdminOrderDetail; user: User }) {
  const router = useRouter();
  const compact = useWindowDimensions().width < 680;
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const packages = order.vendorOrders;
  const ids = selected.filter((id) => packages.some((item) => item.id === id));
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : current.length < batchDocumentLimit ? [...current, id] : current);

  return <View style={styles.shell}>
    <View style={[styles.summary, compact && styles.summaryCompact]}>
      <View style={styles.summaryIcon}><Ionicons color={colors.onPrimary} name="print-outline" size={21} /></View>
      <View style={styles.summaryCopy}><Text style={styles.title}>Documents & printing</Text><Text style={styles.copy}>Invoice, seller packing slips and signed parcel labels.</Text></View>
      <View style={[styles.actions, compact && styles.actionsCompact]}><Pressable accessibilityRole="button" onPress={() => router.push(`/admin/orders/${order.id}/invoice` as never)} style={styles.button}><Ionicons color={colors.onPrimary} name="document-text-outline" size={17} /><Text style={styles.buttonText}>Invoice</Text></Pressable><Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded((value) => !value)} style={styles.secondary}><Text style={styles.text}>{expanded ? "Hide print tools" : "Package print tools"}</Text><Ionicons color={colors.primary} name={expanded ? "chevron-up" : "chevron-down"} size={16} /></Pressable></View>
    </View>
    {expanded ? <ModuleCard title="Seller package documents" meta="Select stores, then print package-specific packing slips or parcel labels.">
      <View style={styles.selectionActions}><Pressable accessibilityRole="button" onPress={() => setSelected(packages.slice(0, batchDocumentLimit).map((item) => item.id))} style={styles.selectionButton}><Text style={styles.text}>Select {packages.length > batchDocumentLimit ? `first ${batchDocumentLimit}` : "all stores"}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setSelected([])} style={styles.selectionButton}><Text style={styles.text}>Clear</Text></Pressable></View>
      <View style={styles.packageGrid}>{packages.map((item, index) => <Pressable key={item.id} accessibilityRole="checkbox" accessibilityState={{ checked: ids.includes(item.id), disabled: !ids.includes(item.id) && ids.length >= batchDocumentLimit }} disabled={!ids.includes(item.id) && ids.length >= batchDocumentLimit} onPress={() => toggle(item.id)} style={[styles.package, !compact && styles.packageWide, ids.includes(item.id) && styles.selected]}><Ionicons color={ids.includes(item.id) ? colors.primary : colors.muted} name={ids.includes(item.id) ? "checkbox" : "square-outline"} size={20} /><View style={styles.packageCopy}><Text numberOfLines={1} style={styles.text}>Package {index + 1} · {item.shopName}</Text><Text style={styles.packageMeta}>{item.items.reduce((total, product) => total + product.quantity, 0)} units · {item.status.replaceAll("_", " ")}</Text></View></Pressable>)}</View>
      <BatchDocuments key={`${user.uid}:${order.id}:${order.version}:${ids.join(",")}`} ids={ids} user={user} />
    </ModuleCard> : null}
  </View>;
}

const styles = StyleSheet.create({
  shell: { gap: spacing.sm }, summary: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.xl, boxShadow: "0 8px 24px rgba(11,31,58,.07)", flexDirection: "row", gap: spacing.md, padding: spacing.md }, summaryCompact: { alignItems: "stretch", flexWrap: "wrap" }, summaryIcon: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, height: 44, justifyContent: "center", width: 44 }, summaryCopy: { flex: 1, minWidth: 190 }, title: { color: colors.text, fontSize: 15, fontWeight: "700" }, copy: { color: colors.muted, flexShrink: 1, fontSize: 11, lineHeight: 17, marginTop: 2 }, actions: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, actionsCompact: { width: "100%" }, button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: 6, justifyContent: "center", minHeight: 42, paddingHorizontal: spacing.md }, buttonText: { color: colors.onPrimary, fontWeight: "700" }, secondary: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: 6, justifyContent: "center", minHeight: 42, paddingHorizontal: spacing.md }, text: { color: colors.text, flexShrink: 1, fontSize: 11, fontWeight: "700" }, selectionActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, selectionButton: { backgroundColor: colors.primarySoft, borderRadius: radius.md, justifyContent: "center", minHeight: 40, paddingHorizontal: spacing.md }, packageGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, package: { alignItems: "center", backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, minHeight: 54, padding: spacing.sm, width: "100%" }, packageWide: { flexGrow: 1, minWidth: 280, width: "48%" }, packageCopy: { flex: 1, minWidth: 0 }, packageMeta: { color: colors.muted, fontSize: 10, marginTop: 3 }, selected: { backgroundColor: colors.accentSoft, borderColor: colors.primary }
});
