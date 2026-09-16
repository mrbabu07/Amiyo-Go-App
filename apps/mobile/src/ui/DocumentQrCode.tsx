import QRCode from "react-native-qrcode-svg";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "./tokens";

export function DocumentQrCode({ label, reference, size = 112, value, getRef }: { label: string; reference: string; size?: number; value: string; getRef?: (ref: { toDataURL: (callback: (data: string) => void) => void }) => void }) {
  return <View accessibilityLabel={`${label}. Reference ${reference}`} accessible style={styles.wrap}>
    <View style={styles.code}><QRCode getRef={getRef} backgroundColor="#FFFFFF" color="#050B14" ecl="M" quietZone={6} size={size} value={value} /></View>
    <Text style={styles.label}>{label}</Text>
    <Text numberOfLines={1} style={styles.reference}>{reference}</Text>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: spacing.xs },
  code: { backgroundColor: "#fff", borderRadius: radius.sm, padding: spacing.xs },
  label: { color: colors.muted, fontSize: 9, fontWeight: "600", textAlign: "center" },
  reference: { color: colors.primary, fontSize: 9, fontWeight: "700", maxWidth: 180, textAlign: "center" }
});
