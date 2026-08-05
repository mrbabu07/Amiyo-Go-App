import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { colors, radius } from "../../../ui/tokens";
import type { HomeCategory } from "../home.data";

export function CategoryRail({ data }: { data: HomeCategory[] }) {
  const router = useRouter();
  return (
    <ScrollView contentContainerStyle={styles.content} horizontal showsHorizontalScrollIndicator={false}>
      {data.map((category) => (
        <Pressable accessibilityRole="button" key={category.id} onPress={() => router.push(`/category/${category.id}` as never)} style={styles.item}>
          <View style={[styles.icon, { backgroundColor: category.color }]}><Ionicons color={category.foreground} name={category.icon as never} size={36} /></View>
          <Text numberOfLines={2} style={styles.label}>{category.name}</Text>
          <Text style={styles.browse}>Browse items</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingBottom: 3 },
  item: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, minHeight: 140, padding: 8, width: 112 },
  icon: { alignItems: "center", borderRadius: radius.md, height: 78, justifyContent: "center", width: "100%" },
  label: { color: colors.text, fontSize: 12, fontWeight: "900", lineHeight: 16, marginTop: 8, minHeight: 32 },
  browse: { color: colors.muted, fontSize: 9, fontWeight: "700", marginTop: 2 }
});
