import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing } from "../../../ui/tokens";
import { useAuthStore } from "../../auth/auth.store";
import { firebaseAuth } from "../../auth/firebase";
import { getCategoryNavigation } from "../../catalog/catalog.api";
import { buildCategoryTree } from "../../catalog/category-tree";
import { getCart } from "../../commerce/commerce.api";
import { BrandLogo } from "./BrandLogo";
import { VoiceSearchButton } from "./VoiceSearchButton";
import { ThemeToggle } from "../../../ui/ThemeToggle";

export function StoreHeader({ desktop, viewportWidth }: { desktop: boolean; viewportWidth: number }) {
  const router = useRouter();
  const hasVendorWorkspace = useAuthStore((state) => Boolean(state.session?.vendorMemberships.length));
  const user = firebaseAuth?.currentUser ?? null;
  const cart = useQuery({ queryKey: ["cart"], queryFn: () => getCart(user!), enabled: Boolean(user) });
  const categories = useQuery({ queryKey: ["catalog", "category-navigation"], queryFn: getCategoryNavigation, enabled: desktop, staleTime: 5 * 60_000 });
  const categoryTree = useMemo(() => buildCategoryTree(categories.data || []), [categories.data]);
  const [query, setQuery] = useState("");
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const compact = viewportWidth < 430;
  const innerWidth = Math.min(viewportWidth, 1280);
  const activeCategory = categoryTree.find((category) => category.id === activeCategoryId) || categoryTree[0];

  useEffect(() => {
    if (!activeCategoryId && categoryTree[0]) setActiveCategoryId(categoryTree[0].id);
  }, [activeCategoryId, categoryTree]);

  const navigate = (href: string) => {
    setCategoriesOpen(false);
    router.push(href as never);
  };
  const search = () => {
    const term = query.trim();
    if (term) navigate(`/search?q=${encodeURIComponent(term)}`);
    else Alert.alert("What are you looking for?", "Enter a product, brand, or shop name.");
  };
  const voiceSearch = (term: string) => {
    setQuery(term);
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <View style={[styles.shell, categoriesOpen && styles.openShell]}>
      {desktop ? <View style={styles.utilityStrip}><View style={[styles.utilityInner, { width: innerWidth }]}><Text style={styles.utilityText}>Free delivery offers | Verified marketplace sellers | Secure SSLCommerz checkout</Text><View style={styles.utilityLinks}><Pressable onPress={() => router.push("/orders" as never)}><Text style={styles.utilityLink}>Track order</Text></Pressable><Pressable onPress={() => router.push(hasVendorWorkspace ? "/vendor/dashboard" : "/vendor/register" as never)}><Text style={styles.utilityLink}>Sell on Amiyo</Text></Pressable></View></View></View> : null}
      <View style={[styles.topRow, { width: innerWidth }, desktop && styles.desktopTopRow]}>
        <Pressable onPress={() => router.replace("/")}><BrandLogo compact={compact} /></Pressable>
        {desktop ? <SearchBox onVoiceResult={voiceSearch} query={query} onChange={setQuery} onSearch={search} /> : null}
        <View style={styles.actions}>
          {desktop ? <ThemeToggle /> : <ThemeToggle compact />}
          {desktop ? <Pressable accessibilityLabel="My account" onPress={() => router.push("/account")} style={styles.iconButton}><Ionicons color={colors.text} name="person-outline" size={22} /></Pressable> : null}
          <Pressable accessibilityLabel="Notifications" onPress={() => router.push("/notifications")} style={styles.iconButton}><Ionicons color={colors.text} name="notifications-outline" size={22} /></Pressable>
          <Pressable accessibilityLabel={`Shopping cart with ${cart.data?.itemCount ?? 0} items`} onPress={() => router.push("/cart")} style={styles.iconButton}><Ionicons color={colors.text} name="cart-outline" size={23} /><View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{Math.min(cart.data?.itemCount ?? 0, 99)}</Text></View></Pressable>
        </View>
      </View>
      {!desktop ? <View style={[styles.mobileSearch, { width: innerWidth }]}><SearchBox compact={compact} onVoiceResult={voiceSearch} query={query} onChange={setQuery} onSearch={search} /></View> : null}

      {desktop ? <View style={styles.navBorder}><View style={[styles.desktopNav, { width: innerWidth }]}>
        <Pressable accessibilityRole="button" onPress={() => setCategoriesOpen((open) => !open)} style={[styles.categoryButton, categoriesOpen && styles.activeCategoryButton]}><Ionicons color={categoriesOpen ? colors.surface : colors.primary} name="menu-outline" size={18} /><Text style={[styles.categoryButtonText, categoriesOpen && styles.activeCategoryButtonText]}>Shop by Category</Text><Ionicons color={categoriesOpen ? colors.surface : colors.primary} name={categoriesOpen ? "chevron-up" : "chevron-down"} size={14} /></Pressable>
        {[{ label: "Home", href: "/" }, { label: "Products", href: "/search" }, { label: "Shops", href: "/shops" }, { label: "Compare", href: "/compare" }].map((item, index) => <Pressable key={item.label} onPress={() => navigate(item.href)}><Text style={[styles.navText, index === 0 && styles.activeNav]}>{item.label}</Text></Pressable>)}
        <Pressable onPress={() => navigate(hasVendorWorkspace ? "/vendor/dashboard" : "/vendor/register")} style={styles.sellerButton}><Text style={styles.sellerLink}>{hasVendorWorkspace ? "Seller center" : "Become a seller"}</Text><Ionicons color={colors.accent} name="arrow-forward" size={14} /></Pressable>
      </View></View> : null}

      {desktop && categoriesOpen ? <View style={[styles.categoryMenu, { width: Math.min(innerWidth, 960) }]}>
        <View style={styles.menuSidebar}>
          <Pressable onPress={() => navigate("/categories")} style={styles.allCategories}><Text style={styles.allCategoriesText}>All Categories</Text><Ionicons color={colors.primary} name="chevron-forward" size={16} /></Pressable>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.rootScroll}>{categoryTree.map((root) => { const active = root.id === activeCategory?.id; return <Pressable key={root.id} onHoverIn={() => setActiveCategoryId(root.id)} onPress={() => setActiveCategoryId(root.id)} style={[styles.rootButton, active && styles.activeRootButton]}><Text numberOfLines={1} style={[styles.rootButtonText, active && styles.activeRootButtonText]}>{root.name}</Text><Ionicons color={active ? colors.primary : colors.muted} name="chevron-forward" size={16} /></Pressable>; })}</ScrollView>
        </View>
        <ScrollView contentContainerStyle={styles.menuContentInner} showsVerticalScrollIndicator={false} style={styles.menuContent}>{activeCategory ? <><View style={styles.menuHeader}><View style={styles.menuHeadingCopy}><Text style={styles.menuTitle}>{activeCategory.name}</Text><Text style={styles.menuDescription}>{activeCategory.description || "Browse sections and product types"}</Text></View><Pressable onPress={() => navigate(`/category/${activeCategory.slug}`)} style={styles.shopAllButton}><Text style={styles.shopAllText}>Shop all</Text></Pressable></View><View style={styles.menuGrid}>{(activeCategory.children.length ? activeCategory.children : [activeCategory]).map((section) => <View key={section.id} style={styles.menuColumn}><Pressable onPress={() => navigate(`/category/${section.slug}`)}><Text style={styles.menuRoot}>{section.name}</Text></Pressable>{section.children.map((leaf) => <Pressable key={leaf.id} onPress={() => navigate(`/category/${leaf.slug}`)}><Text style={styles.menuLeaf}>{leaf.name}</Text></Pressable>)}</View>)}</View></> : <Text style={styles.menuDescription}>Categories are loading.</Text>}</ScrollView>
      </View> : null}
    </View>
  );
}

function SearchBox({ compact = false, query, onChange, onSearch, onVoiceResult }: { compact?: boolean; query: string; onChange(value: string): void; onSearch(): void; onVoiceResult(value: string): void }) {
  return <View style={styles.searchBar}><Ionicons color={colors.muted} name="search-outline" size={20} /><TextInput accessibilityLabel="Search products" onChangeText={onChange} onSubmitEditing={onSearch} placeholder={compact ? "Search products" : "Search products, brands and shops"} placeholderTextColor="#94a3b8" returnKeyType="search" style={styles.searchInput} value={query} /><VoiceSearchButton onResult={onVoiceResult} /><Pressable accessibilityLabel="Search" onPress={onSearch} style={[styles.searchButton, compact && styles.compactSearchButton]}>{compact ? <Ionicons color={colors.surface} name="arrow-forward" size={18} /> : <Text style={styles.searchButtonText}>Search</Text>}</Pressable></View>;
}

const menuShadow = Platform.select({ web: { boxShadow: "0 18px 48px rgba(15,23,42,0.18)" }, default: { elevation: 12, shadowColor: "#0f172a", shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.18, shadowRadius: 24 } });
const styles = StyleSheet.create({
  shell: { backgroundColor: colors.surface, zIndex: 20 }, openShell: { zIndex: 50 }, utilityStrip: { backgroundColor: colors.navy }, utilityInner: { alignItems: "center", alignSelf: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 32, paddingHorizontal: spacing.sm }, utilityText: { color: "rgba(255,255,255,.82)", fontSize: 11, fontWeight: "800" }, utilityLinks: { flexDirection: "row", gap: spacing.md }, utilityLink: { color: colors.surface, fontSize: 11, fontWeight: "900" }, topRow: { alignItems: "center", alignSelf: "center", flexDirection: "row", justifyContent: "space-between", maxWidth: 1280, minHeight: 64, paddingHorizontal: spacing.sm }, desktopTopRow: { gap: spacing.xl, minHeight: 76 },
  searchBar: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.accent, borderRadius: radius.md, borderWidth: 2, flex: 1, flexDirection: "row", maxWidth: 720, overflow: "hidden", paddingLeft: 14, ...Platform.select({ web: { boxShadow: "0 8px 20px rgba(245,114,36,.12)" }, default: { elevation: 2 } }) }, mobileSearch: { alignSelf: "center", marginBottom: 10, maxWidth: 1280, paddingHorizontal: spacing.sm }, searchInput: { color: colors.text, flex: 1, fontSize: 14, height: 46, minWidth: 0, outlineStyle: "none" } as never, searchButton: { alignItems: "center", alignSelf: "stretch", backgroundColor: colors.accent, justifyContent: "center", paddingHorizontal: 24 }, compactSearchButton: { paddingHorizontal: 14 }, searchButtonText: { color: colors.surface, fontSize: 13, fontWeight: "900" },
  actions: { flexDirection: "row", gap: 6 }, iconButton: { alignItems: "center", backgroundColor: colors.background, borderColor: "#edf1f5", borderRadius: radius.pill, borderWidth: 1, height: 42, justifyContent: "center", position: "relative", width: 42 }, cartBadge: { alignItems: "center", backgroundColor: colors.accent, borderColor: colors.surface, borderRadius: radius.pill, borderWidth: 1, height: 18, justifyContent: "center", position: "absolute", right: -2, top: -2, width: 18 }, cartBadgeText: { color: colors.surface, fontSize: 9, fontWeight: "900" },
  navBorder: { borderBottomColor: colors.border, borderBottomWidth: 1, borderTopColor: colors.border, borderTopWidth: 1 }, desktopNav: { alignItems: "center", alignSelf: "center", flexDirection: "row", gap: 26, minHeight: 48, maxWidth: 1280 }, categoryButton: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: 7, height: 36, paddingHorizontal: 12 }, activeCategoryButton: { backgroundColor: colors.primary, borderColor: colors.primary }, categoryButtonText: { color: colors.primary, fontSize: 13, fontWeight: "900" }, activeCategoryButtonText: { color: colors.surface }, navText: { color: colors.muted, fontSize: 13, fontWeight: "800" }, activeNav: { color: colors.primary }, sellerButton: { alignItems: "center", flexDirection: "row", gap: 5, marginLeft: "auto" }, sellerLink: { color: colors.accent, fontSize: 13, fontWeight: "900" },
  categoryMenu: { alignSelf: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", height: 500, overflow: "hidden", position: "absolute", top: 126, zIndex: 100, ...menuShadow }, menuSidebar: { backgroundColor: colors.background, borderRightColor: colors.border, borderRightWidth: 1, paddingVertical: 12, width: 270 }, rootScroll: { flex: 1 }, allCategories: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 5, marginHorizontal: 12, paddingHorizontal: 12, paddingVertical: 10 }, allCategoriesText: { color: colors.primary, fontSize: 13, fontWeight: "900" }, rootButton: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 43, paddingHorizontal: 20 }, activeRootButton: { backgroundColor: colors.surface }, rootButtonText: { color: colors.text, flex: 1, fontSize: 13, fontWeight: "700" }, activeRootButtonText: { color: colors.primary, fontWeight: "900" },
  menuContent: { flex: 1 }, menuContentInner: { padding: spacing.lg }, menuHeader: { alignItems: "flex-start", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingBottom: spacing.md }, menuHeadingCopy: { flex: 1 }, menuTitle: { color: colors.text, fontSize: 20, fontWeight: "900" }, menuDescription: { color: colors.muted, fontSize: 12, marginTop: 5 }, shopAllButton: { borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8 }, shopAllText: { color: colors.primary, fontSize: 11, fontWeight: "900" }, menuGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg, paddingTop: spacing.lg }, menuColumn: { gap: 8, minWidth: 175, width: "29%" }, menuRoot: { color: colors.text, fontSize: 14, fontWeight: "900" }, menuLeaf: { color: colors.muted, fontSize: 12 }
});
