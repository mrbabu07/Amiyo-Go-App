import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { colors, radius } from "../../ui/tokens";

export function OrderItemImage({ name, uri }: { name: string; uri?: string | null }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const available = Boolean(uri && uri !== failedUri);
  return <View style={styles.frame}>
    {available ? <Image accessibilityLabel={name} source={{ uri: uri! }} resizeMode="contain" onError={() => setFailedUri(uri!)} style={styles.image} /> : <View accessible accessibilityRole="image" accessibilityLabel={`${name}: image unavailable`} style={styles.fallback}><Ionicons color={colors.muted} name="image-outline" size={28} /></View>}
  </View>;
}

const styles = StyleSheet.create({
  frame: { height: 72, width: 72, flexShrink: 0, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.primarySoft },
  image: { height: "100%", width: "100%" },
  fallback: { flex: 1, alignItems: "center", justifyContent: "center" }
});
