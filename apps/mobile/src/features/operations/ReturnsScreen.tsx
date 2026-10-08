import type { ReturnDto } from "@amiyo/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getReturns } from "./operations.api";
import { ReturnProductRows } from "./ReturnProductRows";
import { ReturnStatusTracker } from "./ReturnStatusTracker";

const money = (minor: string, currency: string) => `${currency} ${(Number(minor) / 100).toLocaleString("en-BD", { minimumFractionDigits: 2 })}`;
const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());

export function ReturnsScreen() {
  const router = useRouter();
  const user = useCurrentUser();
  const { width } = useWindowDimensions();
  const compact = width < 768;
  const query = useQuery({ queryKey: ["returns", user?.uid], queryFn: () => getReturns(user!), enabled: Boolean(user), refetchInterval: 30_000 });
  const open = query.data?.filter((item) => !["REFUNDED", "REJECTED", "CLOSED"].includes(item.status)).length;
  const refunded = query.data?.filter((item) => item.status === "REFUNDED").length;
  const requestReturn = () => router.push("/orders");
  if (!user) return <Screen title="Returns & refunds" description="Sign in to view your return requests."><Action label="Sign in" primary onPress={() => router.push("/auth")} /></Screen>;

  return <Screen hideHeading title="My Returns">
    <View style={styles.hero}>
      <View style={[styles.headingRow, compact && styles.stacked]}>
        <View style={[styles.headingCopy, compact && styles.fullWidth]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to orders" onPress={requestReturn} style={styles.back}><Ionicons name="arrow-back" color={colors.text} size={21} /></Pressable>
          <View style={styles.flex}><Text style={styles.eyebrow}>Returns and refunds</Text><Text accessibilityRole="header" style={styles.title}>My Returns</Text><Text style={styles.muted}>Start a return, upload evidence, and track refund progress in one place.</Text></View>
        </View>
        <Action label="Request Return" primary onPress={requestReturn} />
      </View>
      <View style={[styles.metrics, compact && styles.stacked]}><Metric compact={compact} label="Requests shown" value={query.data?.length} /><Metric compact={compact} label="Active returns" value={open} accent /><Metric compact={compact} label="Refunded" value={refunded} /></View>
      <Text style={styles.caption}>Select a delivered order to start a request. Eligibility follows your package’s return policy. Counts cover the loaded requests.</Text>
    </View>
    {query.isLoading ? <View accessibilityLabel="Loading return requests" style={styles.empty}><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>Loading your returns…</Text></View> : null}
    {query.error ? <View accessibilityRole="alert" style={styles.errorPanel}><Text style={styles.error}>Could not refresh your returns. {query.error.message}</Text><Action label="Try again" onPress={() => void query.refetch()} /></View> : null}
    <View style={styles.list}>{query.data?.map((item) => <ReturnCard key={item.id} item={item} compact={width < 1024} />)}</View>
    {!query.isLoading && !query.error && !query.data?.length ? <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="return-down-back" color={colors.primary} size={36} /></View><Text accessibilityRole="header" style={styles.emptyTitle}>No returns yet</Text><Text style={styles.emptyCopy}>Choose a delivered order to check its return window, select the items and attach any required evidence.</Text><Action label="Start Return Request" primary onPress={requestReturn} /></View> : null}
  </Screen>;
}

function ReturnCard({ item, compact }: { item: ReturnDto; compact: boolean }) {
  const router = useRouter();
  const open = () => router.push(`/return/${item.id}` as never);
  const rejected = item.status === "REJECTED";
  return <View style={styles.card}>
    <View style={[styles.cardHeader, compact && styles.stacked]}>
      <View style={[styles.flex, compact && styles.fullWidth]}><View style={styles.identity}><Text accessibilityRole="header" style={styles.returnNumber}>Return #{item.id.slice(0, 8).toUpperCase()}</Text><Text style={[styles.status, rejected && styles.rejected]}>{label(item.status)}</Text></View><Text style={styles.muted}>Order #{item.orderId.slice(0, 8).toUpperCase()} · Submitted {new Date(item.createdAt).toLocaleDateString("en-BD")}</Text></View>
      {rejected || item.status === "REVIEWING" ? <Action label="Contact support" onPress={() => router.push({ pathname: "/support", params: { returnId: item.id } } as never)} /> : null}
    </View>
    <View style={[styles.cardBody, compact && styles.stacked]}>
      <View style={[styles.productColumn, compact && styles.fullWidth]}>
        <View style={styles.panel}><Text style={styles.panelTitle}>PRODUCT</Text><ReturnProductRows items={item.items} /></View>
        <View style={styles.panel}><Text style={styles.panelTitle}>REASON</Text><Text style={styles.reason}>{label(item.reasonCode)}</Text>{item.reasonDetail ? <Text style={styles.muted}>{item.reasonDetail}</Text> : null}</View>
      </View>
      <View style={[styles.progressColumn, compact && styles.fullWidth]}>
        <View style={styles.tracker}><View style={styles.identity}><Ionicons name={rejected ? "close-circle-outline" : "return-down-back-outline"} color={rejected ? colors.danger : colors.primary} size={23} /><Text accessibilityRole="header" style={styles.sectionTitle}>Return status</Text></View><Text style={styles.reason}>{label(item.status)}</Text><ReturnStatusTracker item={item} compact={compact} /><Action label="Track return" primary onPress={open} /></View>
        <View style={styles.refund}><View style={styles.identity}><Ionicons name="wallet-outline" color={colors.primary} size={21} /><Text accessibilityRole="header" style={styles.sectionTitle}>Refund summary</Text></View><View style={styles.summaryRow}><Text style={styles.muted}>Requested</Text><Text style={styles.amount}>{money(item.requestedAmount.amountMinor, item.requestedAmount.currency)}</Text></View><View style={styles.summaryRow}><Text style={styles.muted}>Approved</Text><Text style={styles.amount}>{item.approvedAmount ? money(item.approvedAmount.amountMinor, item.approvedAmount.currency) : "Pending"}</Text></View><Text style={styles.caption}>Requested method: {item.refundMethod === "ORIGINAL_PAYMENT" ? "Original payment" : item.refundMethod === "MANUAL" ? "Manual arrangement" : "Not recorded"}</Text><Text style={styles.caption}>Approval does not confirm that a refund has reached your account.</Text></View>
        <Action label="Open related order" onPress={() => router.push(`/order/${item.orderId}` as never)} />
      </View>
    </View>
  </View>;
}

function Metric({ label: title, value, accent, compact }: { label: string; value?: number; accent?: boolean; compact: boolean }) {
  return <View style={[styles.metric, accent && styles.metricAccent, compact && styles.fullWidth]}><Text style={styles.panelTitle}>{title.toUpperCase()}</Text><Text style={styles.metricValue}>{value ?? "—"}</Text></View>;
}

function Action({ label: title, onPress, primary }: { label: string; onPress(): void; primary?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.action, primary && styles.primary, pressed && styles.pressed]}><Text style={[styles.actionText, primary && styles.primaryText]}>{title}</Text></Pressable>;
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.lg },
  headingRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.lg },
  headingCopy: { flexDirection: "row", gap: spacing.md, flex: 1, minWidth: 0 },
  flex: { flex: 1, minWidth: 0, gap: spacing.sm },
  back: { height: 44, width: 44, borderRadius: radius.md, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  eyebrow: { color: colors.primary, fontWeight: "600", fontSize: 13 },
  title: { color: colors.text, fontSize: 28, fontWeight: "600" },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 20, flexShrink: 1 },
  caption: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  metrics: { flexDirection: "row", gap: spacing.sm },
  metric: { flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.background, gap: spacing.sm },
  metricAccent: { backgroundColor: colors.accentSoft },
  metricValue: { color: colors.text, fontSize: 26, fontWeight: "700" },
  list: { gap: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, padding: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  identity: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  returnNumber: { color: colors.text, fontWeight: "600", fontSize: 18 },
  status: { color: colors.primary, backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, fontSize: 12, overflow: "hidden" },
  rejected: { color: colors.danger },
  cardBody: { flexDirection: "row", gap: spacing.lg, padding: spacing.lg },
  productColumn: { flex: 0.8, minWidth: 0, gap: spacing.md },
  progressColumn: { flex: 1.2, minWidth: 0, gap: spacing.md },
  panel: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  panelTitle: { color: colors.muted, fontSize: 11, fontWeight: "600", letterSpacing: 0.6 },
  reason: { color: colors.text, fontWeight: "600", fontSize: 14, lineHeight: 21 },
  sectionTitle: { color: colors.text, fontWeight: "600", fontSize: 16 },
  tracker: { backgroundColor: colors.primarySoft, padding: spacing.md, borderRadius: radius.md, gap: spacing.md },
  refund: { backgroundColor: colors.background, padding: spacing.md, borderRadius: radius.md, gap: spacing.md },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: spacing.sm },
  amount: { color: colors.text, fontWeight: "600", fontSize: 14 },
  action: { minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: 12, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.accentSoft },
  primary: { backgroundColor: colors.primary },
  actionText: { color: colors.text, fontWeight: "600", fontSize: 13, textAlign: "center" },
  primaryText: { color: "#fff" },
  pressed: { opacity: 0.8 },
  stacked: { flexDirection: "column", alignItems: "stretch" },
  fullWidth: { flexGrow: 0, flexShrink: 0, flexBasis: "auto", width: "100%" },
  empty: { alignItems: "center", backgroundColor: colors.surface, padding: spacing.xl, borderRadius: radius.lg, gap: spacing.md },
  emptyIcon: { width: 80, height: 80, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  emptyTitle: { color: colors.text, fontSize: 21, fontWeight: "600" },
  emptyCopy: { color: colors.muted, textAlign: "center", maxWidth: 520, lineHeight: 21 },
  errorPanel: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md },
  error: { color: colors.danger, lineHeight: 20 }
});
