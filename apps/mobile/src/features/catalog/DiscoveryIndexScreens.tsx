import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { StoreHeader } from "../home/components/StoreHeader";
import { getCategories, getShops } from "./catalog.api";
import { getCategoryVisual } from "./category-visuals";
import { buildCategoryTree, filterCategoryTree, flattenCategoryTree, type CategoryNode } from "./category-tree";
import { MarketplacePageHero } from "./MarketplacePageHero";

export function CategoriesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 620;
  const [query, setQuery] = useState("");
  const result = useQuery({ queryKey: ["catalog", "categories"], queryFn: getCategories });
  const tree = useMemo(() => buildCategoryTree(result.data || []), [result.data]);
  const filteredTree = useMemo(() => filterCategoryTree(tree, query), [query, tree]);
  const visibleCount = flattenCategoryTree(filteredTree).length;

  return (
    <DiscoveryShell>
      <StoreHeader desktop={width >= 900} viewportWidth={width} />
      <MarketplacePageHero description="Browse main departments, sections, and subcategories." title="All Categories" />
      <View style={[styles.content, compact && styles.contentCompact]}>
        <View style={[styles.categoryTools, compact && styles.categoryToolsCompact]}>
          <View style={[styles.categorySearch, compact && styles.categorySearchCompact]}>
            <Ionicons color={colors.muted} name="search-outline" size={20} />
            <TextInput accessibilityLabel="Search categories" onChangeText={setQuery} placeholder="Search departments or subcategories" placeholderTextColor={colors.muted} style={styles.categorySearchInput} value={query} />
            {query ? <Pressable accessibilityLabel="Clear category search" hitSlop={10} onPress={() => setQuery("")}><Ionicons color={colors.muted} name="close-circle" size={20} /></Pressable> : null}
          </View>
          <Text style={styles.resultCount}>{query ? `${visibleCount} matching categories` : `${result.data?.length || 0} categories in ${tree.length} departments`}</Text>
        </View>
        {result.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        <View style={styles.departments}>{filteredTree.map((root, index) => <DepartmentCard compact={compact} key={root.id} node={root} index={index} onOpen={(slug) => router.push(`/category/${slug}` as never)} />)}</View>
        {!result.isLoading && !filteredTree.length ? <View style={[styles.emptyState, compact && styles.emptyStateCompact]}><Ionicons color={colors.muted} name="search-outline" size={34} /><Text style={styles.emptyTitle}>No categories found</Text><Text style={styles.cardText}>Try another category name.</Text></View> : null}
        {result.error ? <Text style={styles.error}>Could not load categories.</Text> : null}
      </View>
    </DiscoveryShell>
  );
}

function DepartmentCard({ compact, index, node, onOpen }: { compact: boolean; index: number; node: CategoryNode; onOpen(slug: string): void }) {
  const visual = getCategoryVisual(node, index);
  return (
    <View style={[styles.department, compact && styles.departmentCompact]}>
      <View style={[styles.departmentHeading, compact && styles.departmentHeadingCompact]}>
        <View style={[styles.icon, { backgroundColor: visual.background }]}><Ionicons color={visual.foreground} name={visual.icon as never} size={30} /></View>
        <View style={[styles.headingCopy, compact && styles.headingCopyCompact]}>
          <Pressable accessibilityRole="link" hitSlop={8} onPress={() => onOpen(node.slug)}><Text style={styles.departmentTitle}>{node.name}</Text></Pressable>
          <Text style={styles.cardText}>{node.description || `Shop all ${node.name}`}</Text>
        </View>
        <Pressable accessibilityRole="link" onPress={() => onOpen(node.slug)} style={[styles.shopAllButton, compact && styles.shopAllButtonCompact]}><Text style={styles.shopAll}>Shop all</Text><Ionicons color={colors.primary} name="arrow-forward" size={15} /></Pressable>
      </View>
      <View style={styles.children}>{(node.children.length ? node.children : [node]).map((child) => <View key={child.id} style={[styles.childCard, compact && styles.childCardCompact]}><Pressable accessibilityRole="link" hitSlop={8} onPress={() => onOpen(child.slug)}><Text style={styles.childTitle}>{child.name}</Text></Pressable><View style={styles.leafList}>{child.children.map((leaf) => <Pressable accessibilityRole="link" key={leaf.id} onPress={() => onOpen(leaf.slug)} style={styles.leafButton}><Text style={styles.leaf}>{leaf.name}</Text><Ionicons color={colors.muted} name="chevron-forward" size={14} /></Pressable>)}</View></View>)}</View>
    </View>
  );
}

export function ShopsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 620;
  const columns = width >= 1100 ? 4 : width >= 720 ? 3 : width >= 420 ? 2 : 1;
  const cardWidth = `${100 / columns}%` as `${number}%`;
  const result = useQuery({ queryKey: ["catalog", "shops"], queryFn: getShops });

  return (
    <DiscoveryShell>
      <StoreHeader desktop={width >= 900} viewportWidth={width} />
      <MarketplacePageHero description="Discover approved marketplace sellers." title="Verified Shops" />
      <View style={[styles.content, compact && styles.contentCompact]}>
        {result.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        <View style={styles.grid}>{result.data?.data.map((shop) => <View key={shop.id} style={[styles.cardSlot, { width: cardWidth }]}><Pressable accessibilityRole="link" onPress={() => router.push(`/shop/${shop.slug}` as never)} style={({ pressed }) => [styles.shopCard, compact && styles.shopCardCompact, pressed && styles.cardPressed]}><View style={styles.shopIcon}><Text style={styles.shopInitial}>{shop.name.slice(0, 1)}</Text></View><Text style={styles.cardTitle}>{shop.name}</Text><Text numberOfLines={2} style={styles.cardText}>{shop.description || "Verified Amiyo-Go seller"}</Text><View style={styles.shopFooter}><Text style={styles.count}>{shop.productCount} products</Text><Ionicons color={colors.primary} name="arrow-forward-circle" size={22} /></View></Pressable></View>)}</View>
        {result.error ? <Text style={styles.error}>Could not load shops.</Text> : null}
      </View>
    </DiscoveryShell>
  );
}

function DiscoveryShell({ children }: { children: React.ReactNode }) { return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}>{children}</ScrollView></SafeAreaView>; }

const cardShadow = Platform.select({ web: { boxShadow: "0 10px 28px rgba(11,31,58,.08)" }, default: { elevation: 3, shadowColor: colors.navy, shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.08, shadowRadius: 16 } });

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  page: { minHeight: "100%" },
  content: { alignSelf: "center", maxWidth: 1256, padding: spacing.lg, width: "100%" },
  contentCompact: { padding: spacing.sm },
  categoryTools: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between", marginBottom: spacing.lg, padding: spacing.md, ...cardShadow },
  categoryToolsCompact: { alignItems: "stretch", flexDirection: "column", marginBottom: spacing.md },
  categorySearch: { alignItems: "center", backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, flexDirection: "row", gap: spacing.sm, maxWidth: 560, minWidth: 260, paddingHorizontal: 12 },
  categorySearchCompact: { maxWidth: "100%", minWidth: 0, width: "100%" },
  categorySearchInput: { color: colors.text, flex: 1, fontSize: 14, height: 46, minWidth: 0, outlineStyle: "none" } as never,
  resultCount: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  departments: { gap: spacing.lg },
  department: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, ...cardShadow },
  departmentCompact: { padding: spacing.md },
  departmentHeading: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  departmentHeadingCompact: { alignItems: "flex-start" },
  icon: { alignItems: "center", borderRadius: radius.lg, height: 58, justifyContent: "center", width: 58 },
  headingCopy: { flex: 1, minWidth: 180 },
  headingCopyCompact: { minWidth: 0 },
  departmentTitle: { color: colors.text, fontSize: 21, fontWeight: "700" },
  shopAllButton: { alignItems: "center", flexDirection: "row", gap: spacing.xs, minHeight: 44, paddingHorizontal: spacing.sm },
  shopAllButtonCompact: { flexBasis: "100%", justifyContent: "center" },
  shopAll: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  children: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.lg },
  childCard: { backgroundColor: colors.background, borderRadius: radius.lg, flex: 1, minHeight: 120, minWidth: 220, padding: spacing.md },
  childCardCompact: { flexBasis: "100%", minWidth: 0 },
  childTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  leafList: { gap: spacing.xs, marginTop: spacing.sm },
  leafButton: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 36 },
  leaf: { color: colors.muted, flex: 1, fontSize: 13, lineHeight: 18 },
  emptyState: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderStyle: "dashed", borderWidth: 1, padding: 44 },
  emptyStateCompact: { padding: spacing.lg },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: "700", marginTop: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -spacing.sm, rowGap: spacing.md },
  cardSlot: { paddingHorizontal: spacing.sm },
  shopCard: { backgroundColor: colors.surface, borderRadius: radius.lg, minHeight: 190, padding: spacing.lg, ...cardShadow },
  shopCardCompact: { minHeight: 176, padding: spacing.md },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  shopIcon: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.pill, height: 58, justifyContent: "center", width: 58 },
  shopInitial: { color: colors.surface, fontSize: 23, fontWeight: "700" },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: "700", marginTop: spacing.md },
  cardText: { color: colors.muted, lineHeight: 18, marginTop: 5 },
  shopFooter: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: "auto", paddingTop: spacing.md },
  count: { color: colors.primary, fontSize: 11, fontWeight: "700" },
  error: { color: colors.danger }
});
