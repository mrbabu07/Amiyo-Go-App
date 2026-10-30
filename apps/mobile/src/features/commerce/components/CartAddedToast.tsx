import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../../ui/tokens";

export function CartAddedToast({ onDismiss, quantity = 1 }: { onDismiss(): void; quantity?: number }) {
  useEffect(() => {
    const timeout = setTimeout(onDismiss, 2_400);
    return () => clearTimeout(timeout);
  }, [onDismiss]);

  return <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.toast}><View style={styles.icon}><Ionicons color={colors.onPrimary} name="checkmark" size={17} /></View><View><Text style={styles.title}>Added to cart</Text><Text style={styles.copy}>{quantity} item{quantity === 1 ? "" : "s"} ready in your cart</Text></View></View>;
}

const styles = StyleSheet.create({
  toast: { alignItems: "center", alignSelf: "center", backgroundColor: colors.navy, borderRadius: radius.md, boxShadow: "0 12px 30px rgba(5,11,20,.24)", flexDirection: "row", gap: spacing.sm, maxWidth: 310, paddingHorizontal: spacing.md, paddingVertical: 11, position: "absolute", right: spacing.md, top: spacing.md, zIndex: 80 },
  icon: { alignItems: "center", backgroundColor: colors.success, borderRadius: radius.pill, height: 30, justifyContent: "center", width: 30 },
  title: { color: colors.surface, fontSize: 12, fontWeight: "700" },
  copy: { color: colors.shellMuted, fontSize: 9, marginTop: 2 }
});
