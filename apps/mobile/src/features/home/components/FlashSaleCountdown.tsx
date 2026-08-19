import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../../ui/tokens";

function segments(endAt: string, now: number) {
  const remaining = Math.max(0, new Date(endAt).getTime() - now);
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining / 60_000) % 60);
  const seconds = Math.floor((remaining / 1_000) % 60);
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0"));
}

export function FlashSaleCountdown({ endAt }: { endAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1_000); return () => clearInterval(timer); }, []);
  const values = useMemo(() => segments(endAt, now), [endAt, now]);
  return <View accessibilityLabel={`Sale ends in ${values[0]} hours ${values[1]} minutes ${values[2]} seconds`} style={styles.row}>{values.map((value, index) => <View key={`${index}-${value}`} style={styles.box}><Text style={styles.value}>{value}</Text><Text style={styles.label}>{["HRS", "MIN", "SEC"][index]}</Text></View>)}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 5 },
  box: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 5, minWidth: 38, paddingHorizontal: 7, paddingVertical: 6 },
  value: { color: colors.navy, fontSize: 12, fontWeight: "700" },
  label: { color: colors.muted, fontSize: 7, fontWeight: "600", marginTop: 1 }
});
