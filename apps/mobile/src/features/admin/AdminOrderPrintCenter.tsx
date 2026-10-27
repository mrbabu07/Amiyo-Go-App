import type { AdminOrderDetail } from "@amiyo/contracts";
import type { User } from "@firebase/auth";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { colors, spacing } from "../../ui/tokens";
import { BatchDocuments } from "../orders/BatchDocuments";
import { batchDocumentLimit } from "../orders/batch-documents";

export function AdminOrderPrintCenter({ order, user }: { order: AdminOrderDetail; user: User }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const packages = order.vendorOrders;
  const ids = selected.filter((id) => packages.some((item) => item.id === id));
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : current.length < batchDocumentLimit ? [...current, id] : current);
  return <ModuleCard title="Print center" meta="One order, separate seller packages. Choose the document and shops to print.">
    <Pressable accessibilityRole="button" onPress={() => router.push(`/admin/orders/${order.id}/invoice` as never)} style={styles.button}><Text style={styles.buttonText}>Full order invoice · All stores · A4</Text></Pressable>
    <Text style={styles.copy}>Parcel stickers: 100 × 150 mm with signed QR and package-only collection amount. Packing slips: A4 with each seller’s products. Each selected package prints separately.</Text>
    <View style={styles.actions}>
      <Pressable accessibilityRole="button" onPress={() => setSelected(packages.slice(0, batchDocumentLimit).map((item) => item.id))} style={styles.secondary}><Text style={styles.text}>Select {packages.length > batchDocumentLimit ? `first ${batchDocumentLimit}` : "all stores"}</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => setSelected([])} style={styles.secondary}><Text style={styles.text}>Clear selection</Text></Pressable>
    </View>
    {packages.map((item, index) => <Pressable key={item.id} accessibilityRole="checkbox" accessibilityState={{ checked: ids.includes(item.id), disabled: !ids.includes(item.id) && ids.length >= batchDocumentLimit }} disabled={!ids.includes(item.id) && ids.length >= batchDocumentLimit} onPress={() => toggle(item.id)} style={[styles.package, ids.includes(item.id) && styles.selected]}>
      <Text style={styles.text}>{ids.includes(item.id) ? "☑" : "☐"} Package {index + 1} · {item.shopName}</Text>
      <Text style={styles.copy}>{item.items.reduce((total, product) => total + product.quantity, 0)} units · {item.status.replaceAll("_", " ")}</Text>
    </Pressable>)}
    <BatchDocuments key={`${user.uid}:${order.id}:${order.version}:${ids.join(",")}`} ids={ids} user={user} />
  </ModuleCard>;
}

const styles = StyleSheet.create({ actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, button: { backgroundColor: colors.primary, borderRadius: 10, padding: spacing.md, minHeight: 44 }, buttonText: { color: colors.onPrimary, fontWeight: "600" }, secondary: { backgroundColor: colors.primarySoft, borderRadius: 10, padding: spacing.md, minHeight: 44 }, text: { color: colors.text, fontWeight: "600", flexShrink: 1 }, copy: { color: colors.muted, lineHeight: 20, flexShrink: 1 }, package: { backgroundColor: colors.background, borderRadius: 10, padding: spacing.md, gap: spacing.xs, minHeight: 44 }, selected: { backgroundColor: colors.accentSoft } });
