import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../../ui/tokens";

export type ShopSortMode = "newest" | "popular" | "price-low" | "price-high" | "rating";

type ShopCategoryFilter = { count: number; id: string; name: string };

const sortOptions: Array<{ label: string; value: ShopSortMode }> = [
  { label: "Newest First", value: "newest" },
  { label: "Most Popular", value: "popular" },
  { label: "Price: Low to High", value: "price-low" },
  { label: "Price: High to Low", value: "price-high" },
  { label: "Highest Rated", value: "rating" }
];

export function ShopFilters({ categories, onCategory, onReset, onSort, productCount, selectedCategory, sort }: { categories: ShopCategoryFilter[]; onCategory(value: string): void; onReset(): void; onSort(value: ShopSortMode): void; productCount: number; selectedCategory: string; sort: ShopSortMode }) {
  const dirty = selectedCategory !== "all" || sort !== "newest";
  return <View style={styles.card}>
    <View style={styles.headingRow}><View style={styles.headingCopy}><Ionicons color={colors.text} name="options-outline" size={20} /><Text style={styles.heading}>Filters</Text></View>{dirty ? <Pressable accessibilityRole="button" onPress={onReset}><Text style={styles.reset}>Reset</Text></Pressable> : null}</View>
    <View style={styles.section}>
      <Text style={styles.label}>Categories</Text>
      <FilterOption count={productCount} label="All Products" onPress={() => onCategory("all")} selected={selectedCategory === "all"} />
      {categories.map((category) => <FilterOption count={category.count} key={category.id} label={category.name} onPress={() => onCategory(category.id)} selected={selectedCategory === category.id} />)}
      {!categories.length ? <Text style={styles.empty}>No categories available</Text> : null}
    </View>
    <View style={[styles.section, styles.lastSection]}>
      <Text style={styles.label}>Sort By</Text>
      <View style={styles.sortOptions}>{sortOptions.map((option) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: sort === option.value }} key={option.value} onPress={() => onSort(option.value)} style={[styles.sortOption, sort === option.value && styles.sortOptionActive]}><Text style={[styles.sortText, sort === option.value && styles.sortTextActive]}>{option.label}</Text>{sort === option.value ? <Ionicons color={colors.accent} name="checkmark" size={16} /> : null}</Pressable>)}</View>
    </View>
  </View>;
}

function FilterOption({ count, label, onPress, selected }: { count: number; label: string; onPress(): void; selected: boolean }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={styles.option}><View style={[styles.radio, selected && styles.radioActive]}>{selected ? <View style={styles.radioDot} /> : null}</View><Text numberOfLines={2} style={[styles.optionText, selected && styles.optionTextActive]}>{label} ({count})</Text></Pressable>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  headingRow: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingBottom: 13 },
  headingCopy: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  heading: { color: colors.text, fontSize: 18, fontWeight: "900" },
  reset: { color: colors.accent, fontSize: 13, fontWeight: "800" },
  section: { borderBottomColor: colors.border, borderBottomWidth: 1, paddingVertical: spacing.md },
  lastSection: { borderBottomWidth: 0, paddingBottom: 0 },
  label: { color: colors.text, fontSize: 14, fontWeight: "900", marginBottom: 10 },
  option: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 34 },
  radio: { alignItems: "center", borderColor: "#aab4c0", borderRadius: radius.pill, borderWidth: 1.5, height: 17, justifyContent: "center", width: 17 },
  radioActive: { borderColor: colors.accent },
  radioDot: { backgroundColor: colors.accent, borderRadius: radius.pill, height: 9, width: 9 },
  optionText: { color: colors.muted, flex: 1, fontSize: 13 },
  optionTextActive: { color: colors.accent, fontWeight: "800" },
  empty: { color: colors.muted, fontSize: 13, fontStyle: "italic" },
  sortOptions: { gap: 7 },
  sortOption: { alignItems: "center", backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 38, paddingHorizontal: 11 },
  sortOptionActive: { backgroundColor: colors.accentSoft, borderColor: "#fdba8c" },
  sortText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  sortTextActive: { color: "#c2410c" },
});
