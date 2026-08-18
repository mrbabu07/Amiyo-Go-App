import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { colors } from "../../../ui/tokens";

const items = [
  { label: "Home", icon: "home", href: "/" },
  { label: "Categories", icon: "grid-outline", href: "/categories" },
  { label: "Wishlist", icon: "heart-outline", href: "/wishlist" },
  { label: "Cart", icon: "cart-outline", href: "/cart" },
  { label: "Orders", icon: "bag-handle-outline", href: "/orders" },
  { label: "Account", icon: "person-outline", href: "/account" }
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <View style={styles.nav}>
      {items.map((item) => {
        const active = item.href ? pathname === item.href : false;
        return (
        <Pressable disabled={!item.href} key={item.label} onPress={() => item.href && router.push(item.href as never)} style={styles.item}>
          <Ionicons color={active ? colors.primary : colors.muted} name={item.icon as never} size={22} />
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
  active: { color: colors.primary, fontWeight: "900" }
});
