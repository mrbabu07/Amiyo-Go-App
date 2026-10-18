import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useRef } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { EngagementState } from "./components/EngagementState";
import { getNotifications, readNotification } from "./engagement.api";

function notificationIcon(type: string) {
  if (type.includes("order") || type.includes("delivery")) return "cube-outline";
  if (type.includes("chat") || type.includes("message")) return "chatbubble-outline";
  if (type.includes("stock") || type.includes("price")) return "pricetag-outline";
  return "notifications-outline";
}

export function NotificationsScreen() {
  const compact = useWindowDimensions().width < 620;
  const router = useRouter();
  const cache = useQueryClient();
  const user = useCurrentUser();
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;
  const query = useQuery({ queryKey: ["notifications", user?.uid], queryFn: () => getNotifications(user!), enabled: Boolean(user), refetchInterval: 30_000 });

  async function open(id: string, href: string | null) {
    if (!user) return;
    const ownerUid = user.uid;
    await readNotification(user, id);
    if (activeUid.current !== ownerUid) return;
    await cache.invalidateQueries({ queryKey: ["notifications", ownerUid] });
    if (href) router.push(href as never);
  }

  if (!user) return <EngagementState eyebrow="ACTIVITY" icon="notifications-outline" title="Stay up to date" copy="Sign in to see order, chat, stock and campaign updates." action="Sign in" onPress={() => router.replace("/auth")} />;
  if (query.isLoading) return <EngagementState loading eyebrow="ACTIVITY" icon="notifications-outline" title="Loading notifications" copy="Checking for your latest updates." />;
  if (query.error) return <EngagementState eyebrow="ACTIVITY" icon="alert-circle-outline" title="Could not load notifications" copy={query.error.message} action="Try again" onPress={() => query.refetch()} />;

  const unread = query.data?.filter((item) => !item.readAt).length ?? 0;
  return <Screen eyebrow="ACTIVITY" title="Notifications" description="Order, conversation, stock and campaign updates in one timeline.">
    <View style={[styles.summary, compact && styles.summaryCompact]}><View style={styles.summaryIcon}><Ionicons color={colors.surface} name="notifications" size={24} /></View><View style={styles.flex}><Text accessibilityRole="header" style={styles.summaryTitle}>{unread ? `${unread} unread update${unread === 1 ? "" : "s"}` : "You're all caught up"}</Text><Text style={styles.summaryCopy}>Automatically refreshes every 30 seconds.</Text></View><View style={styles.total}><Text style={styles.totalNumber}>{query.data?.length ?? 0}</Text><Text style={styles.totalLabel}>TOTAL</Text></View></View>
    {query.data?.length ? <View style={styles.list}>{query.data.map((item) => <Pressable accessibilityLabel={`${item.readAt ? "Read" : "Unread"} notification: ${item.title}`} accessibilityRole="button" key={item.id} onPress={() => open(item.id, item.href)} style={[styles.card, compact && styles.cardCompact, !item.readAt && styles.cardUnread]}><View style={[styles.icon, !item.readAt && styles.iconUnread]}><Ionicons color={colors.primary} name={notificationIcon(item.type) as never} size={21} /></View><View style={styles.flex}><View style={styles.titleRow}><Text style={styles.title}>{item.title}</Text>{!item.readAt ? <View style={styles.newBadge}><Text style={styles.newText}>NEW</Text></View> : null}</View><Text style={styles.body}>{item.body}</Text><Text style={styles.date}>{new Date(item.createdAt).toLocaleString("en-BD")}</Text></View>{item.href ? <Ionicons color={colors.muted} name="chevron-forward" size={19} /> : null}</Pressable>)}</View> : <View style={styles.empty}><Ionicons color={colors.primary} name="checkmark-circle-outline" size={52} /><Text style={styles.emptyTitle}>No notifications yet</Text><Text style={styles.muted}>Important marketplace updates will appear here.</Text></View>}
  </Screen>;
}

const styles = StyleSheet.create({ flex: { flex: 1, minWidth: 0 }, summary: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", gap: spacing.md, padding: spacing.lg }, summaryCompact: { alignItems: "flex-start", flexWrap: "wrap" }, summaryIcon: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, height: 46, justifyContent: "center", width: 46 }, summaryTitle: { color: colors.surface, fontSize: 19, fontWeight: "700" }, summaryCopy: { color: colors.border, fontSize: 12, marginTop: 3 }, total: { alignItems: "center", backgroundColor: "rgba(255,255,255,.10)", borderRadius: radius.md, minWidth: 58, padding: spacing.sm }, totalNumber: { color: colors.surface, fontSize: 18, fontWeight: "700" }, totalLabel: { color: colors.accent, fontSize: 8, fontWeight: "700" }, list: { gap: spacing.sm }, card: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.xl, boxShadow: "0 8px 24px rgba(11,31,58,.07)", flexDirection: "row", gap: spacing.md, padding: spacing.md }, cardCompact: { alignItems: "flex-start" }, cardUnread: { backgroundColor: colors.primarySoft }, icon: { alignItems: "center", backgroundColor: colors.background, borderRadius: radius.pill, height: 42, justifyContent: "center", width: 42 }, iconUnread: { backgroundColor: colors.accentSoft }, titleRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, title: { color: colors.text, fontWeight: "700" }, newBadge: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 3 }, newText: { color: colors.surface, fontSize: 8, fontWeight: "700" }, body: { color: colors.muted, lineHeight: 20, marginTop: 4 }, date: { color: colors.muted, fontSize: 10, marginTop: 6 }, empty: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.xl, boxShadow: "0 10px 30px rgba(11,31,58,.08)", gap: spacing.md, padding: 44 }, emptyTitle: { color: colors.text, fontSize: 22, fontWeight: "700" }, muted: { color: colors.muted, textAlign: "center" } });
