import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { actOnTrustCase, getAdminWorkspace, reviewAdminKyc, updateAdminUser, updateAdminUserRoles, updateAdminVendor } from "./admin.api";

const platformRoles = ["SUPPORT_AGENT", "FINANCE_ADMIN", "OPERATIONS_ADMIN", "SUPER_ADMIN"] as const;
type PlatformRole = (typeof platformRoles)[number];

export function AdminTrustScreen() {
  const user = firebaseAuth?.currentUser ?? null;
  const queryClient = useQueryClient();
  const workspace = useQuery({ queryKey: ["admin", "workspace"], queryFn: () => getAdminWorkspace(user!), enabled: Boolean(user) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "workspace"] });
  const userStatus = useMutation({ mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "SUSPENDED" }) => updateAdminUser(user!, id, { status, reason: status === "SUSPENDED" ? "Suspended by trust operations review" : "Restored by trust operations review" }), onSuccess: refresh });
  const userRoles = useMutation({ mutationFn: ({ id, roles }: { id: string; roles: PlatformRole[] }) => updateAdminUserRoles(user!, id, { roles, reason: "Platform staff access updated by super admin" }), onSuccess: refresh });
  const vendorStatus = useMutation({ mutationFn: ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" | "SUSPENDED" }) => updateAdminVendor(user!, id, { status, reason: `Vendor ${status.toLowerCase()} after operations review` }), onSuccess: refresh });
  const kyc = useMutation({ mutationFn: ({ id, status }: { id: string; status: "REVIEWING" | "APPROVED" | "REJECTED" }) => reviewAdminKyc(user!, id, { status, ...(status === "REJECTED" ? { reason: "Documents require correction before approval" } : {}) }), onSuccess: refresh });
  const trust = useMutation({ mutationFn: ({ id, action }: { id: string; action: "INVESTIGATE" | "RESOLVE" | "CLOSE" }) => actOnTrustCase(user!, id, { action, reason: `${action.toLowerCase()} by trust operations` }), onSuccess: refresh });
  const mutationError = userStatus.error || userRoles.error || vendorStatus.error || kyc.error || trust.error;

  if (workspace.isLoading) return <Screen title="Trust and safety"><ActivityIndicator color={colors.primary} /></Screen>;
  return <Screen eyebrow="ADMIN" title="Trust and safety" description="Review identities, marketplace vendors, KYC evidence, risk cases, and platform staff access.">
    {workspace.error ? <Text style={styles.error}>{workspace.error.message}</Text> : null}
    {mutationError ? <Text style={styles.error}>{mutationError.message}</Text> : null}
    <View style={styles.metrics}><Metric label="Users" value={workspace.data?.users.length ?? 0} /><Metric label="KYC queue" value={workspace.data?.kyc.length ?? 0} /><Metric label="Trust cases" value={workspace.data?.trustCases.filter((item) => !["resolved", "closed"].includes(item.status)).length ?? 0} /></View>
    <Text style={styles.heading}>KYC review</Text>
    {workspace.data?.kyc.map((item) => <ModuleCard key={item.id} title={item.vendorName} meta={`${item.status} · ${item.documents.length} documents`}>{item.documents.map((document) => <Text key={document.id} style={styles.muted}>{document.documentType} · {document.mimeType}</Text>)}<Actions labels={["REVIEWING", "APPROVED", "REJECTED"]} active={item.status} onPress={(status) => kyc.mutate({ id: item.id, status: status as "REVIEWING" | "APPROVED" | "REJECTED" })} /></ModuleCard>)}
    <Text style={styles.heading}>Vendor management</Text>
    {workspace.data?.vendors.map((item) => <ModuleCard key={item.id} title={item.displayName} meta={`${item.status} · KYC ${item.latestKycStatus || "NONE"}`}><Text style={styles.muted}>{item.legalName} · {item.shopCount} shops · {item.memberCount} members</Text><Actions labels={["APPROVED", "REJECTED", "SUSPENDED"]} active={item.status} onPress={(status) => vendorStatus.mutate({ id: item.id, status: status as "APPROVED" | "REJECTED" | "SUSPENDED" })} /></ModuleCard>)}
    <Text style={styles.heading}>Trust cases</Text>
    {workspace.data?.trustCases.map((item) => <ModuleCard key={item.id} title={item.summary} meta={`${item.severity.toUpperCase()} · ${item.caseType} · ${item.status}`}><Text style={styles.muted}>{item.subjectType} #{item.subjectId}</Text><Actions labels={["INVESTIGATE", "RESOLVE", "CLOSE"]} active={item.status.toUpperCase()} onPress={(action) => trust.mutate({ id: item.id, action: action as "INVESTIGATE" | "RESOLVE" | "CLOSE" })} /></ModuleCard>)}
    <Text style={styles.heading}>User and staff access</Text>
    {workspace.data?.users.map((item) => {
      const activeRoles = platformRoles.filter((role) => item.roles.includes(role));
      return <ModuleCard key={item.id} title={item.displayName || item.email || "User"} meta={`${item.status} · ${item.roles.join(", ") || "No roles"}`}>
        <Text style={styles.muted}>{item.email || item.phone || item.id}</Text>
        <Text style={styles.label}>Platform roles</Text>
        <View style={styles.actions}>{platformRoles.map((role) => {
          const selected = activeRoles.includes(role);
          const nextRoles = selected ? activeRoles.filter((itemRole) => itemRole !== role) : [...activeRoles, role];
          return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} disabled={userRoles.isPending} key={role} onPress={() => userRoles.mutate({ id: item.id, roles: nextRoles })} style={[styles.chip, selected && styles.active]}><Text style={[styles.chipText, selected && styles.activeText]}>{role.replaceAll("_", " ")}</Text></Pressable>;
        })}</View>
        <Actions labels={["ACTIVE", "SUSPENDED"]} active={item.status} onPress={(status) => userStatus.mutate({ id: item.id, status: status as "ACTIVE" | "SUSPENDED" })} />
      </ModuleCard>;
    })}
  </Screen>;
}

function Actions({ labels, active, onPress }: { labels: string[]; active: string; onPress(value: string): void }) { return <View style={styles.actions}>{labels.map((label) => <Pressable disabled={label === active} key={label} onPress={() => onPress(label)} style={[styles.chip, label === active && styles.active]}><Text style={[styles.chipText, label === active && styles.activeText]}>{label.replaceAll("_", " ")}</Text></Pressable>)}</View>; }
function Metric({ label, value }: { label: string; value: number }) { return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.muted}>{label}</Text></View>; }
const styles = StyleSheet.create({ metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, metric: { backgroundColor: colors.primarySoft, borderRadius: radius.lg, flex: 1, minWidth: 100, padding: spacing.md }, metricValue: { color: colors.primary, fontSize: 26, fontWeight: "900" }, heading: { color: colors.text, fontSize: 21, fontWeight: "900", marginTop: spacing.sm }, label: { color: colors.text, fontSize: 12, fontWeight: "800", marginTop: spacing.sm }, muted: { color: colors.muted, fontSize: 12, lineHeight: 18 }, actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, chip: { borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 }, active: { backgroundColor: colors.primary, borderColor: colors.primary }, chipText: { color: colors.text, fontSize: 10, fontWeight: "900" }, activeText: { color: "#fff" }, error: { color: colors.danger } });
