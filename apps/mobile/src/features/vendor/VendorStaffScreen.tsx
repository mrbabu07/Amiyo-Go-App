import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@firebase/auth";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getVendorStaff, updateVendorStaff } from "./vendor.api";

const permissions = ["orders:read", "orders:manage", "products:manage", "inventory:manage", "returns:manage", "finance:read", "support:manage"] as const;
type Permission = typeof permissions[number];
const permissionPresets: Array<{ label: string; copy: string; permissions: Permission[] }> = [
  { label: "Order desk", copy: "Fulfilment and returns", permissions: ["orders:read", "orders:manage", "returns:manage"] },
  { label: "Catalog", copy: "Products and stock", permissions: ["products:manage", "inventory:manage"] },
  { label: "Support", copy: "Orders and buyer help", permissions: ["orders:read", "support:manage"] },
  { label: "Manager", copy: "All delegated access", permissions: [...permissions] }
];

export function VendorStaffScreen() {
  const compact = useWindowDimensions().width < 620;
  const user = useCurrentUser();
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ["vendor", "staff", user?.uid], queryFn: () => getVendorStaff(user!), enabled: Boolean(user) });
  const [drafts, setDrafts] = useState<Record<string, Permission[]>>({});

  useEffect(() => { setDrafts({}); }, [user?.uid]);

  const save = useMutation({
    retry: false,
    mutationFn: ({ owner, id, status, selected }: { owner: User; id: string; status: "active" | "suspended"; selected: Permission[] }) => updateVendorStaff(owner, id, { status, permissions: selected }),
    onSuccess: async (_data, variables) => {
      if (activeUid.current !== variables.owner.uid) return;
      setDrafts((current) => { const next = { ...current }; delete next[variables.id]; return next; });
      await cache.invalidateQueries({ queryKey: ["vendor", "staff", variables.owner.uid] });
    }
  });

  const selectedFor = (id: string, current: string[]) => drafts[id] ?? current.filter((item): item is Permission => permissions.includes(item as Permission));
  const toggle = (id: string, current: string[], permission: Permission) => {
    const selected = selectedFor(id, current);
    setDrafts((value) => ({ ...value, [id]: selected.includes(permission) ? selected.filter((item) => item !== permission) : [...selected, permission] }));
  };
  const activeCount = query.data?.filter((item) => item.status === "active").length ?? 0;
  const suspendedCount = query.data?.filter((item) => item.status !== "active").length ?? 0;

  return <Screen eyebrow="TEAM ACCESS" title="Staff and permissions" description="Control who can operate your seller workspace and what each member can do.">
    <View style={[styles.summary, compact && styles.summaryCompact]}><View style={styles.summaryLead}><View style={styles.summaryIcon}><Ionicons color={colors.surface} name="people" size={25} /></View><View style={styles.flex}><Text style={styles.summaryEyebrow}>TEAM SECURITY</Text><Text adjustsFontSizeToFit numberOfLines={1} style={styles.summaryValue}>Seller workspace access</Text><Text style={styles.summaryMeta}>Use least-privilege roles and suspend access immediately when responsibilities change.</Text></View></View><View style={[styles.summaryMetrics, compact && styles.summaryMetricsCompact]}><TeamMetric label="Members" value={query.data?.length ?? 0} /><TeamMetric label="Active" value={activeCount} /><TeamMetric label="Suspended" value={suspendedCount} /></View></View>
    {query.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
    <View style={styles.list}>{query.data?.map((member) => {
      const owner = member.role === "VENDOR_OWNER";
      const selected = selectedFor(member.id, member.permissions);
      const currentPermissions = member.permissions.filter((item): item is Permission => permissions.includes(item as Permission));
      const changed = Boolean(drafts[member.id]) && [...selected].sort().join("|") !== [...currentPermissions].sort().join("|");
      return <View key={member.id} style={styles.card}>
        <View style={[styles.cardHeader, compact && styles.cardHeaderCompact]}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(member.displayName || member.email || "S").slice(0, 1).toUpperCase()}</Text></View>
          <View style={styles.flex}><Text style={styles.name}>{member.displayName || "Seller staff"}</Text><Text numberOfLines={compact ? 2 : 1} style={styles.email}>{member.email || member.userId}</Text></View>
          <View style={[styles.badge, member.status !== "active" && styles.badgeSuspended]}><Text style={styles.badgeText}>{member.status.toUpperCase()}</Text></View>
        </View>
        <Text style={styles.role}>{member.role.replaceAll("_", " ")}</Text>
        {owner ? <View style={styles.owner}><Ionicons color={colors.success} name="shield-checkmark" size={17} /><Text style={styles.ownerText}>Owner has full seller workspace access.</Text></View> : <>
          <Text style={styles.label}>PERMISSIONS</Text>
          <View style={styles.presets}>{permissionPresets.map((preset) => { const active = [...preset.permissions].sort().join("|") === [...selected].sort().join("|"); return <Pressable accessibilityRole="button" key={preset.label} onPress={() => setDrafts((value) => ({ ...value, [member.id]: preset.permissions }))} style={[styles.preset, active && styles.presetActive]}><View style={styles.presetIcon}><Ionicons color={active ? colors.surface : colors.primary} name={preset.label === "Order desk" ? "bag-check-outline" : preset.label === "Catalog" ? "cube-outline" : preset.label === "Support" ? "headset-outline" : "shield-checkmark-outline"} size={18} /></View><View><Text style={[styles.presetTitle, active && styles.presetTitleActive]}>{preset.label}</Text><Text style={[styles.presetCopy, active && styles.presetCopyActive]}>{preset.copy}</Text></View></Pressable>; })}</View>
          <View style={styles.permissions}>{permissions.map((permission) => {
            const active = selected.includes(permission);
            return <Pressable key={permission} onPress={() => toggle(member.id, member.permissions, permission)} style={[styles.permission, active && styles.permissionActive]}><Ionicons color={active ? colors.surface : colors.muted} name={active ? "checkmark-circle" : "ellipse-outline"} size={16} /><Text style={[styles.permissionText, active && styles.permissionTextActive]}>{permissionLabel(permission)}</Text></Pressable>;
          })}</View>
          <View style={[styles.actions, compact && styles.actionsCompact]}>
            <Pressable disabled={!user || save.isPending} onPress={() => user && save.mutate({ owner: user, id: member.id, status: member.status === "active" ? "suspended" : "active", selected })} style={[styles.secondary, compact && styles.actionCompact]}><Text style={styles.secondaryText}>{member.status === "active" ? "Suspend access" : "Restore access"}</Text></Pressable>
            <Pressable accessibilityState={{ disabled: !user || save.isPending || !changed }} disabled={!user || save.isPending || !changed} onPress={() => user && save.mutate({ owner: user, id: member.id, status: member.status as "active" | "suspended", selected })} style={[styles.primary, compact && styles.actionCompact, !changed && styles.disabled]}><Text style={styles.primaryText}>{changed ? "Save permissions" : "Permissions saved"}</Text></Pressable>
          </View>
        </>}
      </View>;
    })}</View>
    {query.data?.length === 0 ? <View style={styles.empty}><Ionicons color={colors.primary} name="person-add-outline" size={42} /><Text style={styles.emptyTitle}>No staff members yet</Text><Text style={styles.email}>Staff invited to your workspace will appear here.</Text></View> : null}
    {query.error || save.error ? <Text style={styles.error}>{(query.error || save.error)?.message}</Text> : null}
  </Screen>;
}

function permissionLabel(value: Permission) { return value.replace(":", " · ").replaceAll("_", " "); }
function TeamMetric({ label, value }: { label: string; value: number }) { return <View style={styles.summaryMetric}><Text style={styles.summaryMetricValue}>{value}</Text><Text style={styles.summaryMetricLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summary: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", gap: spacing.xl, justifyContent: "space-between", padding: spacing.xl },
  summaryCompact: { alignItems: "stretch", flexDirection: "column", gap: spacing.lg, padding: spacing.lg },
  summaryLead: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.md, minWidth: 0 },
  summaryIcon: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, height: 52, justifyContent: "center", width: 52 },
  summaryEyebrow: { color: colors.accent, fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  summaryValue: { color: colors.surface, fontSize: 21, fontWeight: "700" },
  summaryMeta: { color: "#C9C2B6", fontSize: 10, lineHeight: 16, marginTop: 4 },
  summaryMetrics: { flexDirection: "row", gap: spacing.sm, minWidth: 300 },
  summaryMetricsCompact: { minWidth: 0, width: "100%" },
  summaryMetric: { alignItems: "center", backgroundColor: "rgba(255,255,255,.09)", borderRadius: radius.lg, flex: 1, minWidth: 0, padding: spacing.md },
  summaryMetricValue: { color: colors.surface, fontSize: 19, fontWeight: "700" },
  summaryMetricLabel: { color: "#C9C2B6", fontSize: 8, marginTop: 3 },
  list: { gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, boxShadow: "0 8px 24px rgba(11,31,58,.07)", gap: spacing.md, padding: spacing.lg },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  cardHeaderCompact: { alignItems: "flex-start", flexWrap: "wrap" },
  avatar: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 46, justifyContent: "center", width: 46 },
  avatarText: { color: colors.primary, fontSize: 17, fontWeight: "700" },
  name: { color: colors.text, fontWeight: "700" },
  email: { color: colors.muted, fontSize: 11, marginTop: 3 },
  badge: { backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 6 },
  badgeSuspended: { backgroundColor: colors.primarySoft },
  badgeText: { color: colors.text, fontSize: 8, fontWeight: "700" },
  role: { color: colors.primary, fontSize: 10, fontWeight: "700" },
  label: { color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: .8 },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  preset: { alignItems: "center", backgroundColor: colors.background, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, minHeight: 58, minWidth: 145, padding: spacing.sm },
  presetActive: { backgroundColor: colors.navy },
  presetIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.sm, height: 34, justifyContent: "center", width: 34 },
  presetTitle: { color: colors.text, fontSize: 10, fontWeight: "700" },
  presetTitleActive: { color: colors.surface },
  presetCopy: { color: colors.muted, fontSize: 8, marginTop: 2 },
  presetCopyActive: { color: "#C9C2B6" },
  permissions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  permission: { alignItems: "center", borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, flexDirection: "row", gap: 5, paddingHorizontal: 10, paddingVertical: 8 },
  permissionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  permissionText: { color: colors.muted, fontSize: 9, fontWeight: "600", textTransform: "capitalize" },
  permissionTextActive: { color: colors.surface },
  owner: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.md, flexDirection: "row", gap: 7, padding: spacing.md },
  ownerText: { color: colors.success, flex: 1, fontSize: 11, fontWeight: "600" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "flex-end" },
  actionsCompact: { alignItems: "stretch", flexDirection: "column" },
  actionCompact: { alignItems: "center", width: "100%" },
  secondary: { borderColor: colors.danger, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 11 },
  secondaryText: { color: colors.danger, fontWeight: "700" },
  primary: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 11 },
  primaryText: { color: colors.surface, fontWeight: "700" },
  disabled: { opacity: .45 },
  empty: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderStyle: "dashed", borderWidth: 1, gap: spacing.sm, padding: 40 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  error: { color: colors.danger }
});
