import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../../ui/tokens";

const items = [
  { label: "Home", icon: "home", active: true },
  { label: "Categories", icon: "grid-outline" },
  { label: "Cart", icon: "cart-outline" },
  { label: "Orders", icon: "bag-handle-outline" },
  { label: "Account", icon: "person-outline" }
];

export function BottomNav() {
  return (
    <View style={styles.nav}>
      {items.map((item) => (
        <Pressable key={item.label} style={styles.item}>
          <Ionicons color={item.active ? colors.primary : colors.muted} name={item.icon as never} size={22} />
          <Text style={[styles.label, item.active && styles.active]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", minHeight: 66, paddingBottom: 4, shadowColor: "#0f172a", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  item: { alignItems: "center", flex: 1, gap: 3, justifyContent: "center" },
  label: { color: colors.muted, fontSize: 9, fontWeight: "700" },
  active: { color: colors.primary, fontWeight: "900" }
});
