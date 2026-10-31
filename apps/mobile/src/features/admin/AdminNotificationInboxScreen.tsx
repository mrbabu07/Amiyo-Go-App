import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getNotifications, readNotification } from "../engagement/engagement.api";

function notificationIcon(type: string): keyof typeof Ionicons.glyphMap {
  if (type.includes("order") || type.includes("delivery")) return "cube-outline";
  if (type.includes("payout") || type.includes("payment")) return "wallet-outline";
  if (type.includes("vendor") || type.includes("seller")) return "storefront-outline";
  if (type.includes("product") || type.includes("stock")) return "cube-outline";
  if (type.includes("return")) return "return-down-back-outline";
  return "notifications-outline";
}

export function AdminNotificationInboxScreen() {
  const compact = useWindowDimensions().width < 620;
  const user = useCurrentUser();
  const cache = useQueryClient();
  const key = ["notifications", user?.uid] as const;
  const query = useQuery({ queryKey: key, queryFn: () => getNotifications(user!), enabled: Boolean(user), refetchInterval: 30_000 });
  const [busyId, setBusyId] = useState<string | null>(null);

  async function markRead(id: string) {
    if (!user || busyId) return;
    setBusyId(id);
    try {
      await readNotification(user, id);
      await cache.invalidateQueries({ queryKey: key });
    } finally {
      setBusyId(null);
    }
  }

  if (!user) return <Screen eyebrow="ADMIN ACTIVITY" title="Notifications" description="Sign in with an administrator account to view operational updates." />;
  if (query.isLoading) return <Screen eyebrow="ADMIN ACTIVITY" title="Notifications"><ActivityIndicator color={colors.primary} /></Screen>;
  if (query.error) return <Screen eyebrow="ADMIN ACTIVITY" title="Notifications"><View style={styles.error}><Ionicons color={colors.danger} name="alert-circle-outline" size={20} /><Text style={styles.errorText}>{query.error.message}</Text></View></Screen>;

  const notifications = query.data ?? [];
  const unread = notifications.filter((item) => !item.readAt).length;
  return <Screen eyebrow="ADMIN ACTIVITY" title="Notifications" description="New orders, seller activity, payments and operational alerts appear here with their full details.">
    <View style={[styles.summary, compact && styles.summaryCompact]}><View style={styles.summaryIcon}><Ionicons color={colors.surface} name="notifications" size={23} /></View><View style={styles.flex}><Text style={styles.summaryTitle}>{unread ? `${unread} new update${unread === 1 ? "" : "s"}` : "You're all caught up"}</Text><Text style={styles.summaryCopy}>Refreshes automatically every 30 seconds.</Text></View><View style={styles.total}><Text style={styles.totalNumber}>{notifications.length}</Text><Text style={styles.totalLabel}>TOTAL</Text></View></View>
    {notifications.length ? <View style={styles.list}>{notifications.map((item) => <Pressable accessibilityLabel={`${item.readAt ? "Read" : "New"} notification: ${item.title}`} accessibilityRole="button" key={item.id} onPress={() => void markRead(item.id)} style={[styles.card, compact && styles.cardCompact, !item.readAt && styles.cardUnread]}><View style={[styles.icon, !item.readAt && styles.iconUnread]}><Ionicons color={colors.primary} name={notificationIcon(item.type)} size={21} /></View><View style={styles.flex}><View style={styles.titleRow}><Text style={styles.title}>{item.title}</Text>{!item.readAt ? <View style={styles.newBadge}><Text style={styles.newText}>NEW</Text></View> : <Text style={styles.readLabel}>READ</Text>}</View><Text style={styles.body}>{item.body}</Text><View style={styles.metaRow}><Text style={styles.date}>{new Date(item.createdAt).toLocaleString("en-BD")}</Text><Text style={styles.type}>{item.type.replaceAll("_", " ")}</Text></View></View>{busyId === item.id ? <ActivityIndicator color={colors.primary} /> : <Ionicons color={colors.muted} name={item.readAt ? "checkmark-circle-outline" : "chevron-forward"} size={19} />}</Pressable>)}</View> : <View style={styles.empty}><Ionicons color={colors.primary} name="checkmark-circle-outline" size={52} /><Text style={styles.emptyTitle}>No notifications yet</Text><Text style={styles.emptyCopy}>New orders and operational updates will appear here.</Text></View>}
  </Screen>;
}

const styles = StyleSheet.create({ flex: { flex: 1, minWidth: 0 }, summary: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", gap: spacing.md, padding: spacing.lg }, summaryCompact: { alignItems: "flex-start", flexWrap: "wrap" }, summaryIcon: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, height: 46, justifyContent: "center", width: 46 }, summaryTitle: { color: colors.surface, fontSize: 19, fontWeight: "700" }, summaryCopy: { color: colors.border, fontSize: 12, marginTop: 3 }, total: { alignItems: "center", backgroundColor: "rgba(255,255,255,.10)", borderRadius: radius.md, minWidth: 58, padding: spacing.sm }, totalNumber: { color: colors.surface, fontSize: 18, fontWeight: "700" }, totalLabel: { color: colors.accent, fontSize: 8, fontWeight: "700" }, list: { gap: spacing.sm }, card: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.xl, boxShadow: "0 8px 24px rgba(11,31,58,.07)", flexDirection: "row", gap: spacing.md, padding: spacing.md }, cardCompact: { alignItems: "flex-start" }, cardUnread: { backgroundColor: colors.primarySoft }, icon: { alignItems: "center", backgroundColor: colors.background, borderRadius: radius.pill, height: 42, justifyContent: "center", width: 42 }, iconUnread: { backgroundColor: colors.accentSoft }, titleRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, title: { color: colors.text, fontWeight: "700" }, newBadge: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 3 }, newText: { color: colors.surface, fontSize: 8, fontWeight: "700" }, readLabel: { color: colors.muted, fontSize: 9, fontWeight: "700" }, body: { color: colors.muted, lineHeight: 20, marginTop: 4 }, metaRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: 6 }, date: { color: colors.muted, fontSize: 10 }, type: { color: colors.primary, fontSize: 10, fontWeight: "600", textTransform: "capitalize" }, empty: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.xl, gap: spacing.md, padding: 44 }, emptyTitle: { color: colors.text, fontSize: 22, fontWeight: "700" }, emptyCopy: { color: colors.muted, textAlign: "center" }, error: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.md }, errorText: { color: colors.danger, flex: 1 } });
