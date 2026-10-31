import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "./tokens";

export function BrandLoader({ label = "Loading Amiyo-Go" }: { label?: string }) {
  const pulse = useRef(new Animated.Value(0.72)).current;
  useEffect(() => { const animation = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }), Animated.timing(pulse, { toValue: 0.72, duration: 650, useNativeDriver: true })])); animation.start(); return () => animation.stop(); }, [pulse]);
  return <View accessibilityLabel={label} accessibilityRole="progressbar" style={styles.wrap}><Animated.View style={[styles.mark, { opacity: pulse, transform: [{ scale: pulse }] }]}><Ionicons color={colors.onPrimary} name="bag-handle" size={22} /></Animated.View><Text style={styles.label}>{label}</Text><View style={styles.track}><Animated.View style={[styles.progress, { opacity: pulse }]} /></View></View>;
}

const styles = StyleSheet.create({ wrap: { alignItems: "center", alignSelf: "center", backgroundColor: colors.surface, borderRadius: radius.xl, gap: spacing.sm, minWidth: 190, padding: spacing.lg }, mark: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.pill, height: 48, justifyContent: "center", width: 48 }, label: { color: colors.text, fontSize: 11, fontWeight: "700" }, track: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 4, overflow: "hidden", width: 105 }, progress: { backgroundColor: colors.accent, borderRadius: radius.pill, height: "100%", width: "62%" } });
