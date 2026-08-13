import { StyleSheet, Text, View } from "react-native";
import { colors, radius } from "../../../ui/tokens";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.container}>
      <View style={[styles.mark, compact && styles.compactMark]}><Text style={[styles.markText, compact && styles.compactMarkText]}>A</Text></View>
      <View>
        <Text style={styles.name}>Amiyo-Go</Text>
        {!compact ? <Text style={styles.tagline}>SHOP • SAVE • SMILE</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", flexDirection: "row", gap: 9 },
  mark: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, height: 38, justifyContent: "center", transform: [{ rotate: "-6deg" }], width: 38 },
  compactMark: { height: 34, width: 34 },
  markText: { color: colors.surface, fontSize: 24, fontWeight: "900" },
  compactMarkText: { fontSize: 21 },
  name: { color: colors.navy, fontSize: 19, fontWeight: "900", letterSpacing: -0.6 },
  tagline: { color: colors.accent, fontSize: 7, fontWeight: "900", letterSpacing: 1.2 }
});
