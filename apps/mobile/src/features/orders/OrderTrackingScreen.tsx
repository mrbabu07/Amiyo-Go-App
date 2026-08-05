import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { getOrderTracking } from "./orders.api";

const formatStatus = (status: string) => status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

export function OrderTrackingScreen({ id }: { id: string }) {
  const router = useRouter();
  const user = firebaseAuth?.currentUser ?? null;
  const tracking = useQuery({ queryKey: ["orders", id, "tracking"], queryFn: () => getOrderTracking(user!, id), enabled: Boolean(user), refetchInterval: 30_000 });

  if (!user) return <TrackingState title="Sign in to track this order" copy="Delivery information is available securely from your account." action="Sign in" onPress={() => router.replace("/auth")} />;
  if (tracking.isLoading) return <TrackingState loading title="Loading tracking" copy="Checking the latest seller and courier updates." />;
  if (!tracking.data) return <TrackingState title="Tracking unavailable" copy={tracking.error instanceof Error ? tracking.error.message : "Please try again."} action="Try again" onPress={() => tracking.refetch()} />;

  const activeShipments = tracking.data.shipments.filter((entry) => entry.shipment).length;
  return <Screen eyebrow="DELIVERY STATUS" title={tracking.data.orderNumber} description="Live shipment updates refresh automatically every 30 seconds.">
    <View style={styles.overview}>
      <View style={styles.overviewIcon}><Ionicons color={colors.surface} name="navigate" size={25} /></View>
      <View style={styles.overviewCopy}><Text accessibilityRole="header" style={styles.overviewTitle}>{formatStatus(tracking.data.status)}</Text><Text style={styles.muted}>{activeShipments} of {tracking.data.shipments.length} shipment{tracking.data.shipments.length === 1 ? "" : "s"} dispatched</Text></View>
      <View style={styles.live}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
    </View>
    <View style={styles.list}>{tracking.data.shipments.map((entry) => <View key={entry.vendorOrderId} style={styles.card}>
      <View style={styles.cardHeader}><View><Text style={styles.shop}>{entry.shopName}</Text><Text style={styles.muted}>Seller shipment</Text></View>{entry.shipment ? <Text style={styles.status}>{formatStatus(entry.shipment.status)}</Text> : <Text style={styles.pending}>Preparing</Text>}</View>
      {entry.shipment ? <>
        <View style={styles.trackingRow}><Ionicons color={colors.primary} name="cube-outline" size={24} /><View style={styles.trackingCopy}><Text style={styles.trackingNumber}>{entry.shipment.trackingNumber || "Tracking number pending"}</Text><Text style={styles.muted}>Courier tracking reference</Text></View></View>
        <View style={styles.timeline}>{entry.shipment.events.length ? entry.shipment.events.map((event, index) => <View key={event.id} style={styles.event}><View style={styles.rail}><View style={[styles.dot, index === 0 && styles.dotActive]} />{index < entry.shipment!.events.length - 1 ? <View style={styles.line} /> : null}</View><View style={styles.eventCopy}><Text style={styles.eventTitle}>{formatStatus(event.status)}</Text><Text style={styles.muted}>{event.description || "Shipment updated"}</Text><View style={styles.eventMeta}><Ionicons color={colors.muted} name="time-outline" size={13} /><Text style={styles.time}>{new Date(event.occurredAt).toLocaleString("en-BD")}{event.location ? ` · ${event.location}` : ""}</Text></View></View></View>) : <Text style={styles.muted}>Courier events will appear after pickup.</Text>}</View>
      </> : <View style={styles.waiting}><Ionicons color={colors.primary} name="storefront-outline" size={23} /><Text style={styles.waitingText}>The seller is preparing your package. Tracking starts after courier handover.</Text></View>}
    </View>)}</View>
    <Pressable accessibilityRole="button" onPress={() => router.push(`/order/${id}` as never)} style={styles.back}><Ionicons color={colors.primary} name="arrow-back" size={17} /><Text style={styles.backText}>Back to order details</Text></Pressable>
  </Screen>;
}

function TrackingState({ action, copy, loading, onPress, title }: { action?: string; copy: string; loading?: boolean; onPress?: () => void; title: string }) {
  return <Screen eyebrow="DELIVERY STATUS" title={title} description={copy}><View style={styles.empty}>{loading ? <ActivityIndicator color={colors.primary} size="large" /> : <Ionicons color={colors.primary} name="navigate-circle-outline" size={50} />}{action && onPress ? <Pressable onPress={onPress} style={styles.primary}><Text style={styles.primaryText}>{action}</Text></Pressable> : null}</View></Screen>;
}

const styles = StyleSheet.create({
  overview: { alignItems: "center", backgroundColor: colors.primarySoft, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.lg }, overviewIcon: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, height: 48, justifyContent: "center", width: 48 }, overviewCopy: { flex: 1 }, overviewTitle: { color: colors.text, fontSize: 20, fontWeight: "900" }, live: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.pill, flexDirection: "row", gap: 5, paddingHorizontal: 10, paddingVertical: 6 }, liveDot: { backgroundColor: colors.success, borderRadius: radius.pill, height: 7, width: 7 }, liveText: { color: colors.success, fontSize: 10, fontWeight: "900" }, list: { gap: spacing.md }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, padding: spacing.lg }, cardHeader: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingBottom: spacing.md }, shop: { color: colors.text, fontSize: 18, fontWeight: "900" }, muted: { color: colors.muted, lineHeight: 19 }, status: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, color: colors.primary, fontSize: 10, fontWeight: "900", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 6 }, pending: { backgroundColor: "#fff7ed", borderRadius: radius.pill, color: colors.accent, fontSize: 10, fontWeight: "900", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 6 }, trackingRow: { alignItems: "center", backgroundColor: colors.background, borderRadius: radius.md, flexDirection: "row", gap: spacing.md, padding: spacing.md }, trackingCopy: { flex: 1 }, trackingNumber: { color: colors.text, fontWeight: "900" }, timeline: { paddingTop: spacing.sm }, event: { flexDirection: "row", gap: spacing.md, minHeight: 86 }, rail: { alignItems: "center", width: 18 }, dot: { backgroundColor: colors.border, borderRadius: radius.pill, height: 13, width: 13 }, dotActive: { backgroundColor: colors.primary, borderColor: colors.primarySoft, borderWidth: 3, height: 17, width: 17 }, line: { backgroundColor: colors.border, flex: 1, width: 2 }, eventCopy: { flex: 1, paddingBottom: spacing.md }, eventTitle: { color: colors.text, fontWeight: "900" }, eventMeta: { alignItems: "center", flexDirection: "row", gap: 5, marginTop: 5 }, time: { color: colors.muted, fontSize: 11 }, waiting: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.md, padding: spacing.md }, waitingText: { color: colors.primaryDark, flex: 1, lineHeight: 20 }, back: { alignItems: "center", alignSelf: "flex-start", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 11 }, backText: { color: colors.primary, fontWeight: "900" }, empty: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderStyle: "dashed", borderWidth: 1, gap: spacing.lg, padding: 44 }, primary: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 13 }, primaryText: { color: colors.surface, fontWeight: "900" }
});
