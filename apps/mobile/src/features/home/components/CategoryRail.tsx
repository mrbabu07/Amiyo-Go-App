import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "../../../ui/tokens";
import { categories } from "../home.data";

export function CategoryRail() {
  return (
    <ScrollView contentContainerStyle={styles.content} horizontal showsHorizontalScrollIndicator={false}>
      {categories.map((category) => (
        <View key={category.id} style={styles.item}>
          <View style={[styles.icon, { backgroundColor: category.color }]}><Ionicons color={colors.navy} name={category.icon as never} size={27} /></View>
          <Text numberOfLines={2} style={styles.label}>{category.name}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingBottom: 3 },
  item: { alignItems: "center", width: 82 },
  icon: { alignItems: "center", borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, height: 68, justifyContent: "center", width: 68 },
  label: { color: colors.text, fontSize: 11, fontWeight: "700", lineHeight: 14, marginTop: 7, textAlign: "center" }
});
