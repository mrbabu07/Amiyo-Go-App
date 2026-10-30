import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { colors } from "../../../ui/tokens";
import { useMarketplaceLocale } from "../../platform/marketplace-locale";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "../../auth/use-current-user";
import { getCart } from "../../commerce/commerce.api";
import { getNotifications, getWishlist } from "../../engagement/engagement.api";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useMarketplaceLocale();
  const user = useCurrentUser();
  const cart = useQuery({ queryKey: ["cart", user?.uid ?? null], queryFn: () => getCart(user!), enabled: Boolean(user) });
  const wishlist = useQuery({ queryKey: ["wishlist", user?.uid ?? null], queryFn: () => getWishlist(user!), enabled: Boolean(user), staleTime: 30_000 });
  const notifications = useQuery({ queryKey: ["notifications", user?.uid ?? null], queryFn: () => getNotifications(user!), enabled: Boolean(user), refetchInterval: 30_000 });
  const orderUpdates = notifications.data?.filter((item) => !item.readAt && item.href?.startsWith("/orders")).length ?? 0;
  const items = [{ label: t.home, icon: "home", href: "/", count: 0 }, { label: t.categories, icon: "grid-outline", href: "/categories", count: 0 }, { label: t.wishlist, icon: "heart-outline", href: "/wishlist", count: wishlist.data?.items.length ?? 0 }, { label: t.cart, icon: "cart-outline", href: "/cart", count: cart.data?.itemCount ?? 0 }, { label: t.orders, icon: "bag-handle-outline", href: "/orders", count: orderUpdates }, { label: t.account, icon: "person-outline", href: "/account", count: 0 }];
  return (
    <View style={styles.nav}>
      {items.map((item) => {
        const active = item.href ? pathname === item.href : false;
        return (
        <Pressable disabled={!item.href} key={item.label} onPress={() => item.href && router.push(item.href as never)} style={styles.item}>
          <View style={styles.iconWrap}><Ionicons color={active ? colors.primary : colors.muted} name={item.icon as never} size={22} />{item.count ? <View style={styles.badge}><Text style={styles.badgeText}>{item.count > 99 ? "99+" : item.count}</Text></View> : null}</View>
          <Text style={[styles.label, active && styles.active]}>{item.label}</Text>
        </Pressable>
      );})}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", minHeight: 66, paddingBottom: 4, ...Platform.select({ web: { boxShadow: "0 -4px 12px rgba(15,23,42,0.08)" }, default: { shadowColor: "#0f172a", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12 } }) },
  item: { alignItems: "center", flex: 1, gap: 3, justifyContent: "center" },
  label: { color: colors.muted, fontSize: 9, fontWeight: "700" },
  active: { color: colors.primary, fontWeight: "700" },
  iconWrap: { position: "relative" },
  badge: { alignItems: "center", backgroundColor: colors.danger, borderColor: colors.surface, borderRadius: 9, borderWidth: 1, justifyContent: "center", minHeight: 17, minWidth: 17, paddingHorizontal: 3, position: "absolute", right: -11, top: -7 },
  badgeText: { color: colors.surface, fontSize: 8, fontWeight: "700" }
});
