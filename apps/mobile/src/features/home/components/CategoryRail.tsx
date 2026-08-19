import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "../../../ui/tokens";
import type { HomeCategory } from "../home.data";

export function CategoryRail({ data }: { data: HomeCategory[] }) {
  const router = useRouter();
  return (
    <ScrollView contentContainerStyle={styles.content} horizontal showsHorizontalScrollIndicator={false}>
      {data.map((category) => (
        <Pressable accessibilityRole="button" key={category.id} onPress={() => router.push(`/category/${category.id}` as never)} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
          <View style={[styles.icon, { backgroundColor: category.color }]}><Ionicons color={category.foreground} name={category.icon as never} size={28} /></View>
          <Text numberOfLines={2} style={styles.label}>{category.name}</Text>
          <View style={styles.arrow}><Ionicons color={colors.primary} name="chevron-forward" size={13} /></View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const shadow = Platform.select({ web: { boxShadow: "0 6px 18px rgba(15,23,42,.06)" }, default: { elevation: 2 } });
const styles = StyleSheet.create({
  content: { gap: 10, paddingBottom: 4, paddingTop: 2 },
  item: { alignItems: "center", backgroundColor: colors.surface, borderColor: "#edf1f5", borderRadius: radius.md, borderWidth: 1, minHeight: 112, padding: 9, position: "relative", width: 104, ...shadow },
  pressed: { opacity: 0.9, transform: [{ translateY: 1 }] },
  icon: { alignItems: "center", borderRadius: radius.md, height: 54, justifyContent: "center", width: "100%" },
  label: { color: colors.text, fontSize: 11, fontWeight: "700", lineHeight: 15, marginTop: 8, minHeight: 30, textAlign: "center" },
  arrow: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.pill, bottom: 6, height: 18, justifyContent: "center", position: "absolute", right: 6, width: 18 }
});
