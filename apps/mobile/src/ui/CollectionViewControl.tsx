import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "./tokens";

export type CollectionDirection = "vertical" | "horizontal";
export type CollectionSize = "small" | "large";
export type CollectionViewPreference = { direction: CollectionDirection; size: CollectionSize };

const defaults: CollectionViewPreference = { direction: "horizontal", size: "large" };
const storageKey = (scope: string) => `amiyo.collection-view.${scope}`;

export function useCollectionView(scope: string, initial: Partial<CollectionViewPreference> = {}) {
  const [preference, setPreference] = useState<CollectionViewPreference>({ ...defaults, ...initial });
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(storageKey(scope)).then((stored) => {
      if (!active || !stored) return;
      try {
        const parsed = JSON.parse(stored) as Partial<CollectionViewPreference>;
        if ((parsed.direction === "vertical" || parsed.direction === "horizontal") && (parsed.size === "small" || parsed.size === "large")) setPreference(parsed as CollectionViewPreference);
      } catch {}
    });
    return () => { active = false; };
  }, [scope]);
  const update = (next: CollectionViewPreference) => { setPreference(next); void AsyncStorage.setItem(storageKey(scope), JSON.stringify(next)); };
  return { preference, setDirection: (direction: CollectionDirection) => update({ ...preference, direction }), setSize: (size: CollectionSize) => update({ ...preference, size }) };
}

export function CollectionViewControl({ preference, setDirection, setSize }: { preference: CollectionViewPreference; setDirection(direction: CollectionDirection): void; setSize(size: CollectionSize): void }) {
  return <View accessibilityLabel="View options" style={styles.shell}>
    <Text style={styles.label}>View</Text>
    <View style={styles.group}>
      <Option active={preference.direction === "vertical"} icon="list-outline" label="Vertical" onPress={() => setDirection("vertical")} />
      <Option active={preference.direction === "horizontal"} icon="grid-outline" label="Horizontal" onPress={() => setDirection("horizontal")} />
    </View>
    <View style={styles.group}>
      <Option active={preference.size === "small"} icon="contract-outline" label="Small" onPress={() => setSize("small")} />
      <Option active={preference.size === "large"} icon="expand-outline" label="Large" onPress={() => setSize("large")} />
    </View>
  </View>;
}

function Option({ active, icon, label, onPress }: { active: boolean; icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; onPress(): void }) {
  return <Pressable accessibilityLabel={`${label} view`} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.option, active && styles.active]}><Ionicons color={active ? colors.onPrimary : colors.muted} name={icon} size={15} /><Text style={[styles.optionText, active && styles.activeText]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({ shell: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.surface, borderRadius: radius.lg, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, padding: 6 }, label: { color: colors.text, fontSize: 10, fontWeight: "700", paddingHorizontal: 5, textTransform: "uppercase" }, group: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", overflow: "hidden" }, option: { alignItems: "center", flexDirection: "row", gap: 4, minHeight: 38, paddingHorizontal: 9 }, active: { backgroundColor: colors.primary }, optionText: { color: colors.muted, fontSize: 9, fontWeight: "700" }, activeText: { color: colors.onPrimary } });
