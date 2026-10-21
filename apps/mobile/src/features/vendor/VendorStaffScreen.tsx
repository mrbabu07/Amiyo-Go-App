import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@firebase/auth";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getVendorStaff, inviteVendorStaff, updateVendorStaff } from "./vendor.api";

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
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"VENDOR_MANAGER" | "VENDOR_STAFF">("VENDOR_STAFF");
  const [invitePermissions, setInvitePermissions] = useState<Permission[]>(permissionPresets[0].permissions);
  const [notice, setNotice] = useState("");

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
  const invite = useMutation({
    retry: false,
    mutationFn: ({ owner, emailAddress }: { owner: User; emailAddress: string }) => inviteVendorStaff(owner, { email: emailAddress, role: inviteRole, permissions: invitePermissions }),
    onSuccess: async (_data, variables) => {
      if (activeUid.current !== variables.owner.uid) return;
      setEmail(""); setInviteRole("VENDOR_STAFF"); setInvitePermissions(permissionPresets[0].permissions); setNotice("Team member added successfully.");
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
    <View style={[styles.inviteCard, compact && styles.inviteCardCompact]}>
      <View style={styles.inviteCopy}><Text style={styles.inviteEyebrow}>OWNER CONTROL</Text><Text style={styles.inviteTitle}>Add a team member</Text><Text style={styles.inviteDescription}>The team member must already have an active Amiyo account. Access starts immediately with only the permissions you select.</Text></View>
      <View style={styles.inviteForm}>
        <Text style={styles.label}>ACCOUNT EMAIL</Text>
        <TextInput accessibilityLabel="Team member account email" autoCapitalize="none" autoComplete="email" inputMode="email" onChangeText={(value) => { setEmail(value); setNotice(""); }} placeholder="name@example.com" placeholderTextColor={colors.muted} style={styles.input} value={email} />
        <Text style={styles.label}>WORKSPACE ROLE</Text>
        <View style={styles.roleOptions}>{(["VENDOR_STAFF", "VENDOR_MANAGER"] as const).map((role) => <Pressable key={role} onPress={() => setInviteRole(role)} style={[styles.roleOption, inviteRole === role && styles.roleOptionActive]}><Ionicons color={inviteRole === role ? colors.surface : colors.primary} name={role === "VENDOR_MANAGER" ? "shield-checkmark-outline" : "person-outline"} size={18} /><View style={styles.flex}><Text style={[styles.roleOptionTitle, inviteRole === role && styles.roleOptionTitleActive]}>{role === "VENDOR_MANAGER" ? "Manager" : "Staff"}</Text><Text style={[styles.roleOptionCopy, inviteRole === role && styles.roleOptionCopyActive]}>{role === "VENDOR_MANAGER" ? "Senior operational team member" : "Task-focused delegated access"}</Text></View></Pressable>)}</View>
        <Text style={styles.label}>ACCESS PRESET</Text>
        <View style={styles.presets}>{permissionPresets.map((preset) => { const active = samePermissions(preset.permissions, invitePermissions); return <Pressable key={preset.label} onPress={() => setInvitePermissions(preset.permissions)} style={[styles.preset, active && styles.presetActive]}><View style={styles.presetIcon}><Ionicons color={active ? colors.surface : colors.primary} name={preset.label === "Order desk" ? "bag-check-outline" : preset.label === "Catalog" ? "cube-outline" : preset.label === "Support" ? "headset-outline" : "shield-checkmark-outline"} size={18} /></View><View><Text style={[styles.presetTitle, active && styles.presetTitleActive]}>{preset.label}</Text><Text style={[styles.presetCopy, active && styles.presetCopyActive]}>{preset.copy}</Text></View></Pressable>; })}</View>
        <View style={styles.permissions}>{permissions.map((permission) => { const active = invitePermissions.includes(permission); return <Pressable key={permission} onPress={() => setInvitePermissions((current) => active ? current.filter((item) => item !== permission) : [...current, permission])} style={[styles.permission, active && styles.permissionActive]}><Ionicons color={active ? colors.surface : colors.muted} name={active ? "checkmark-circle" : "ellipse-outline"} size={16} /><Text style={[styles.permissionText, active && styles.permissionTextActive]}>{permissionLabel(permission)}</Text></Pressable>; })}</View>
        <Pressable accessibilityRole="button" disabled={!user || invite.isPending || !email.trim() || invitePermissions.length === 0} onPress={() => user && invite.mutate({ owner: user, emailAddress: email.trim() })} style={[styles.inviteButton, (!user || invite.isPending || !email.trim() || invitePermissions.length === 0) && styles.disabled]}>{invite.isPending ? <ActivityIndicator color={colors.surface} /> : <Ionicons color={colors.surface} name="person-add-outline" size={19} />}<Text style={styles.primaryText}>{invite.isPending ? "Adding member..." : "Add team member"}</Text></Pressable>
        {notice ? <Text style={styles.success}>{notice}</Text> : null}
        {invite.error ? <Text style={styles.error}>{invite.error.message}</Text> : null}
      </View>
    </View>
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
function samePermissions(left: readonly Permission[], right: readonly Permission[]) { return [...left].sort().join("|") === [...right].sort().join("|"); }
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
  inviteCard: { alignItems: "flex-start", backgroundColor: colors.surface, borderRadius: radius.xl, boxShadow: "0 10px 30px rgba(11,31,58,.08)", flexDirection: "row", gap: spacing.xl, padding: spacing.xl },
  inviteCardCompact: { flexDirection: "column", gap: spacing.lg, padding: spacing.lg },
  inviteCopy: { flex: 0.7, gap: spacing.sm, minWidth: 210 },
  inviteEyebrow: { color: colors.primary, fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  inviteTitle: { color: colors.text, fontSize: 22, fontWeight: "700" },
  inviteDescription: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  inviteForm: { flex: 1.3, gap: spacing.sm, minWidth: 0, width: "100%" },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, fontSize: 14, minHeight: 48, paddingHorizontal: spacing.md },
  roleOptions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  roleOption: { alignItems: "center", backgroundColor: colors.background, borderRadius: radius.md, flex: 1, flexDirection: "row", gap: spacing.sm, minHeight: 60, minWidth: 180, padding: spacing.sm },
  roleOptionActive: { backgroundColor: colors.navy },
  roleOptionTitle: { color: colors.text, fontSize: 11, fontWeight: "700" },
  roleOptionTitleActive: { color: colors.surface },
  roleOptionCopy: { color: colors.muted, fontSize: 9, marginTop: 2 },
  roleOptionCopyActive: { color: "#C9C2B6" },
  inviteButton: { alignItems: "center", alignSelf: "flex-end", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 46, paddingHorizontal: spacing.lg },
  success: { color: colors.success, fontSize: 11, fontWeight: "600" },
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
