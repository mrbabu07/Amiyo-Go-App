import type { AdminOrderDetail } from "@amiyo/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { extendAdminOrderReturnWindow } from "./admin.api";

export function AdminOrderReturnWindow({ order }: { order: AdminOrderDetail }) {
  const user = firebaseAuth?.currentUser!; const cache = useQueryClient(); const [date, setDate] = useState(order.returnWindowUntil?.slice(0, 10) ?? ""); const [reason, setReason] = useState("");
  const mutation = useMutation({ mutationFn: () => extendAdminOrderReturnWindow(user, order.id, { expectedVersion: order.version, returnWindowUntil: new Date(`${date}T23:59:59.999Z`).toISOString(), reason: reason.trim() }), onSuccess: () => Promise.all([cache.invalidateQueries({ queryKey: ["admin", "order", order.id] }), cache.invalidateQueries({ queryKey: ["admin", "commerce"] })]) });
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && new Date(`${date}T23:59:59.999Z`).getTime() > Date.now() && reason.trim().length >= 5;
  return <ModuleCard title="Return-window exception" meta={order.returnWindowUntil ? `Current deadline: ${new Date(order.returnWindowUntil).toLocaleString("en-BD")}` : "No custom return deadline is configured."}>{mutation.error ? <Text style={styles.error}>{mutation.error.message}</Text> : null}<View style={styles.grid}><View style={styles.field}><Text style={styles.label}>New deadline (YYYY-MM-DD)</Text><TextInput value={date} onChangeText={setDate} placeholder="2026-09-01" placeholderTextColor={colors.muted} style={styles.input} /></View><View style={styles.field}><Text style={styles.label}>Exception reason</Text><TextInput value={reason} onChangeText={setReason} placeholder="Approved customer-service exception" placeholderTextColor={colors.muted} style={styles.input} /></View></View><Pressable disabled={!valid || mutation.isPending} onPress={() => mutation.mutate()} style={[styles.button, (!valid || mutation.isPending) && styles.disabled]}><Text style={styles.buttonText}>{mutation.isPending ? "Extending..." : "Extend return window"}</Text></Pressable></ModuleCard>;
}
const styles = StyleSheet.create({ error: { color: colors.danger }, grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, field: { flex: 1, minWidth: 210 }, label: { color: colors.text, fontSize: 10, fontWeight: "900", marginBottom: 5 }, input: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 43, paddingHorizontal: 12 }, button: { alignSelf: "flex-start", backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11 }, buttonText: { color: colors.surface, fontSize: 10, fontWeight: "900" }, disabled: { opacity: .45 } });
