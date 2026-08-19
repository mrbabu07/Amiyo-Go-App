import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { StoreHeader } from "../home/components/StoreHeader";
import { getCategories, getShops } from "./catalog.api";
import { getCategoryVisual } from "./category-visuals";
import { buildCategoryTree, filterCategoryTree, flattenCategoryTree, type CategoryNode } from "./category-tree";
import { MarketplacePageHero } from "./MarketplacePageHero";

export function CategoriesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const result = useQuery({ queryKey: ["catalog", "categories"], queryFn: getCategories });
  const tree = useMemo(() => buildCategoryTree(result.data || []), [result.data]);
  const filteredTree = useMemo(() => filterCategoryTree(tree, query), [query, tree]);
  const visibleCount = flattenCategoryTree(filteredTree).length;
  return <DiscoveryShell><StoreHeader desktop={width >= 900} viewportWidth={width} /><MarketplacePageHero description="Browse main departments, sections, and subcategories." title="All Categories" /><View style={styles.content}><View style={styles.categoryTools}><View style={styles.categorySearch}><Ionicons color={colors.muted} name="search-outline" size={20} /><TextInput accessibilityLabel="Search categories" onChangeText={setQuery} placeholder="Search departments or subcategories" placeholderTextColor="#94a3b8" style={styles.categorySearchInput} value={query} />{query ? <Pressable accessibilityLabel="Clear category search" onPress={() => setQuery("")}><Ionicons color={colors.muted} name="close-circle" size={20} /></Pressable> : null}</View><Text style={styles.resultCount}>{query ? `${visibleCount} matching categories` : `${result.data?.length || 0} categories in ${tree.length} departments`}</Text></View>{result.isLoading ? <ActivityIndicator color={colors.primary} /> : null}<View style={styles.departments}>{filteredTree.map((root, index) => <DepartmentCard key={root.id} node={root} index={index} onOpen={(slug) => router.push(`/category/${slug}` as never)} />)}</View>{!result.isLoading && !filteredTree.length ? <View style={styles.emptyState}><Ionicons color={colors.muted} name="search-outline" size={34} /><Text style={styles.emptyTitle}>No categories found</Text><Text style={styles.cardText}>Try another category name.</Text></View> : null}{result.error ? <Text style={styles.error}>Could not load categories.</Text> : null}</View></DiscoveryShell>;
}

function DepartmentCard({ index, node, onOpen }: { index: number; node: CategoryNode; onOpen(slug: string): void }) {
  const visual = getCategoryVisual(node, index);
  return <View style={styles.department}><View style={styles.departmentHeading}><View style={[styles.icon, { backgroundColor: visual.background }]}><Ionicons color={visual.foreground} name={visual.icon as never} size={30} /></View><View style={styles.headingCopy}><Pressable onPress={() => onOpen(node.slug)}><Text style={styles.departmentTitle}>{node.name}</Text></Pressable><Text style={styles.cardText}>{node.description || `Shop all ${node.name}`}</Text></View><Pressable onPress={() => onOpen(node.slug)}><Text style={styles.shopAll}>Shop all</Text></Pressable></View><View style={styles.children}>{(node.children.length ? node.children : [node]).map((child) => <View key={child.id} style={styles.childCard}><Pressable onPress={() => onOpen(child.slug)}><Text style={styles.childTitle}>{child.name}</Text></Pressable><View style={styles.leafList}>{child.children.map((leaf) => <Pressable key={leaf.id} onPress={() => onOpen(leaf.slug)}><Text style={styles.leaf}>{leaf.name}</Text></Pressable>)}</View></View>)}</View></View>;
}

export function ShopsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const columns = width >= 1100 ? 4 : width >= 720 ? 3 : 2;
  const cardWidth = `${100 / columns}%` as `${number}%`;
  const result = useQuery({ queryKey: ["catalog", "shops"], queryFn: getShops });
  return <DiscoveryShell><StoreHeader desktop={width >= 900} viewportWidth={width} /><MarketplacePageHero description="Discover approved marketplace sellers." title="Verified Shops" /><View style={styles.content}>{result.isLoading ? <ActivityIndicator color={colors.primary} /> : null}<View style={styles.grid}>{result.data?.data.map((shop) => <View key={shop.id} style={[styles.cardSlot, { width: cardWidth }]}><Pressable accessibilityRole="button" onPress={() => router.push(`/shop/${shop.slug}` as never)} style={styles.shopCard}><View style={styles.shopIcon}><Text style={styles.shopInitial}>{shop.name.slice(0, 1)}</Text></View><Text style={styles.cardTitle}>{shop.name}</Text><Text numberOfLines={2} style={styles.cardText}>{shop.description || "Verified Amiyo-Go seller"}</Text><Text style={styles.count}>{shop.productCount} products</Text></Pressable></View>)}</View>{result.error ? <Text style={styles.error}>Could not load shops.</Text> : null}</View></DiscoveryShell>;
}

function DiscoveryShell({ children }: { children: React.ReactNode }) { return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}>{children}</ScrollView></SafeAreaView>; }

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 }, page: { minHeight: "100%" }, content: { alignSelf: "center", maxWidth: 1256, padding: spacing.lg, width: "100%" }, categoryTools: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between", marginBottom: spacing.lg, padding: spacing.md }, categorySearch: { alignItems: "center", backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, flexDirection: "row", gap: spacing.sm, maxWidth: 560, minWidth: 260, paddingHorizontal: 12 }, categorySearchInput: { color: colors.text, flex: 1, fontSize: 14, height: 44, outlineStyle: "none" } as never, resultCount: { color: colors.muted, fontSize: 12, fontWeight: "600" }, departments: { gap: spacing.lg }, department: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg }, departmentHeading: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, icon: { alignItems: "center", borderRadius: radius.lg, height: 58, justifyContent: "center", width: 58 }, headingCopy: { flex: 1, minWidth: 180 }, departmentTitle: { color: colors.text, fontSize: 21, fontWeight: "700" }, shopAll: { color: colors.primary, fontSize: 13, fontWeight: "700" }, children: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.lg }, childCard: { borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flex: 1, minHeight: 120, minWidth: 220, padding: spacing.md }, childTitle: { color: colors.text, fontSize: 15, fontWeight: "700" }, leafList: { gap: spacing.sm, marginTop: 12 }, leaf: { color: colors.muted, fontSize: 13, lineHeight: 18 }, emptyState: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderStyle: "dashed", borderWidth: 1, padding: 44 }, emptyTitle: { color: colors.text, fontSize: 17, fontWeight: "700", marginTop: spacing.sm }, grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -spacing.sm, rowGap: spacing.md }, cardSlot: { paddingHorizontal: spacing.sm }, shopCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, minHeight: 190, padding: spacing.lg }, shopIcon: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.pill, height: 58, justifyContent: "center", width: 58 }, shopInitial: { color: colors.surface, fontSize: 23, fontWeight: "700" }, cardTitle: { color: colors.text, fontSize: 17, fontWeight: "700", marginTop: spacing.md }, cardText: { color: colors.muted, lineHeight: 18, marginTop: 5 }, count: { color: colors.primary, fontSize: 11, fontWeight: "700", marginTop: "auto", paddingTop: spacing.md }, error: { color: colors.danger }
});
