import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type NativeSyntheticEvent, type TextInputKeyPressEventData } from "react-native";
import { colors, radius, spacing } from "../../../ui/tokens";
import { formatMinor } from "../../../ui/money";
import { useAuthStore } from "../../auth/auth.store";
import { useCurrentUser } from "../../auth/use-current-user";
import { getCategoryNavigation, searchProducts } from "../../catalog/catalog.api";
import { buildCategoryTree } from "../../catalog/category-tree";
import { clearRecentSearches, getDiscoverySessionId, getRecentSearches, getTrendingSearches, rememberSearch, safelyRecordDiscoveryEvent } from "../../catalog/discovery.api";
import { getCart } from "../../commerce/commerce.api";
import { getWishlist } from "../../engagement/engagement.api";
import { BrandLogo } from "./BrandLogo";
import { VoiceSearchButton } from "./VoiceSearchButton";
import { ThemeToggle } from "../../../ui/ThemeToggle";

type SearchSuggestion = { href: string; icon?: string; id: string; image: string | null; meta: string; title: string; type: "category" | "product" | "shop" };

export function StoreHeader({ desktop, viewportWidth }: { desktop: boolean; viewportWidth: number }) {
  const router = useRouter();
  const hasVendorWorkspace = useAuthStore((state) => Boolean(state.session?.vendorMemberships.length));
  const user = useCurrentUser();
  const cart = useQuery({ queryKey: ["cart", user?.uid ?? null], queryFn: () => getCart(user!), enabled: Boolean(user) });
  const wishlist = useQuery({ queryKey: ["wishlist", user?.uid ?? null], queryFn: () => getWishlist(user!), enabled: Boolean(user), staleTime: 30_000 });
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [discoverySessionId, setDiscoverySessionId] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const categories = useQuery({ queryKey: ["catalog", "category-navigation"], queryFn: getCategoryNavigation, enabled: desktop || debouncedQuery.length >= 2, staleTime: 5 * 60_000 });
  const suggestionQuery = useQuery({ queryKey: ["catalog", "search-suggestions", debouncedQuery], queryFn: () => searchProducts(debouncedQuery, 8), enabled: debouncedQuery.length >= 2, staleTime: 60_000 });
  const trendingQuery = useQuery({ queryKey: ["catalog", "trending-searches"], queryFn: getTrendingSearches, staleTime: 5 * 60_000, retry: 1 });
  const categoryTree = useMemo(() => buildCategoryTree(categories.data || []), [categories.data]);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const compact = viewportWidth < 430;
  const innerWidth = Math.min(viewportWidth, 1280);
  const activeCategory = categoryTree.find((category) => category.id === activeCategoryId) || categoryTree[0];
  const suggestions = useMemo<SearchSuggestion[]>(() => {
    if (debouncedQuery.length < 2) return [];
    const needle = debouncedQuery.toLocaleLowerCase();
    const matchedCategories = (categories.data || []).filter((category) => `${category.name} ${category.slug}`.toLocaleLowerCase().includes(needle)).slice(0, 2).map((category) => ({ href: `/category/${category.slug}`, icon: "grid-outline", id: `category:${category.id}`, image: null, meta: "Category", title: category.name, type: "category" as const }));
    const products = (suggestionQuery.data?.data || []).slice(0, 5).map((product) => ({ href: `/product/${product.slug}`, id: `product:${product.id}`, image: product.thumbnailUrl, meta: `${product.shopName} · ${formatMinor(product.minimumPrice.amountMinor)}`, title: product.name, type: "product" as const }));
    const seenShops = new Set<string>();
    const shops = (suggestionQuery.data?.data || []).flatMap((product) => { if (seenShops.has(product.shopId)) return []; seenShops.add(product.shopId); return [{ href: `/shop/${product.shopSlug}`, icon: "storefront-outline", id: `shop:${product.shopId}`, image: null, meta: "Verified shop", title: product.shopName, type: "shop" as const }]; }).slice(0, 2);
    return [...matchedCategories, ...products, ...shops].slice(0, 8);
  }, [categories.data, debouncedQuery, suggestionQuery.data?.data]);

  useEffect(() => {
    if (!activeCategoryId && categoryTree[0]) setActiveCategoryId(categoryTree[0].id);
  }, [activeCategoryId, categoryTree]);
  useEffect(() => { const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 250); return () => clearTimeout(timeout); }, [query]);
  useEffect(() => { void Promise.all([getDiscoverySessionId(), getRecentSearches()]).then(([sessionId, recent]) => { setDiscoverySessionId(sessionId); setRecentSearches(recent); }); }, []);

  const navigate = (href: string) => {
    setCategoriesOpen(false);
    router.push(href as never);
  };
  const trackSearch = (term: string) => {
    if (term.trim().length < 2) return;
    void rememberSearch(term).then(setRecentSearches);
    if (discoverySessionId) safelyRecordDiscoveryEvent({ sessionId: discoverySessionId, eventType: "SEARCH", query: term.trim() });
  };
  const selectSuggestion = (suggestion: SearchSuggestion) => { trackSearch(query || suggestion.title); setQuery(suggestion.title); navigate(suggestion.href); };
  const search = () => {
    const term = query.trim();
    if (term) { trackSearch(term); navigate(`/search?q=${encodeURIComponent(term)}`); }
    else Alert.alert("What are you looking for?", "Enter a product, brand, or shop name.");
  };
  const voiceSearch = (term: string) => {
    trackSearch(term);
    setQuery(term);
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };
  const useDiscoveryTerm = (term: string) => { setQuery(term); trackSearch(term); navigate(`/search?q=${encodeURIComponent(term)}`); };
  const clearHistory = () => { setRecentSearches([]); void clearRecentSearches(); };

  return (
    <View style={[styles.shell, categoriesOpen && styles.openShell]}>
      {desktop ? <View style={styles.utilityStrip}><View style={[styles.utilityInner, { width: innerWidth }]}><Text style={styles.utilityText}>Free delivery offers | Verified marketplace sellers | Secure SSLCommerz checkout</Text><View style={styles.utilityLinks}><Pressable onPress={() => router.push("/orders" as never)}><Text style={styles.utilityLink}>Track order</Text></Pressable><Pressable onPress={() => router.push(hasVendorWorkspace ? "/vendor/dashboard" : "/vendor/register" as never)}><Text style={styles.utilityLink}>Sell on Amiyo</Text></Pressable></View></View></View> : null}
      <View style={[styles.topRow, compact && styles.compactTopRow, { width: innerWidth }, desktop && styles.desktopTopRow]}>
        <Pressable onPress={() => router.replace("/")}><BrandLogo compact={compact} /></Pressable>
        {desktop ? <SearchBox loading={suggestionQuery.isFetching} onClearRecent={clearHistory} onDiscoveryTerm={useDiscoveryTerm} onSelect={selectSuggestion} onVoiceResult={voiceSearch} query={query} onChange={setQuery} onSearch={search} recentSearches={recentSearches} suggestions={suggestions} trendingSearches={(trendingQuery.data || []).map((item) => item.query)} /> : null}
        <View style={[styles.actions, compact && styles.compactActions]}>
          {desktop ? <ThemeToggle /> : <ThemeToggle compact />}
          {desktop ? <Pressable accessibilityLabel="My account" onPress={() => router.push("/account")} style={styles.iconButton}><Ionicons color={colors.text} name="person-outline" size={22} /></Pressable> : null}
          <Pressable accessibilityLabel={`Wishlist with ${wishlist.data?.items.length ?? 0} items`} onPress={() => router.push("/wishlist")} style={[styles.iconButton, compact && styles.compactIconButton]}><Ionicons color={colors.text} name={wishlist.data?.items.length ? "heart" : "heart-outline"} size={22} />{wishlist.data?.items.length ? <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{Math.min(wishlist.data.items.length, 99)}</Text></View> : null}</Pressable>
          <Pressable accessibilityLabel="Notifications" onPress={() => router.push("/notifications")} style={[styles.iconButton, compact && styles.compactIconButton]}><Ionicons color={colors.text} name="notifications-outline" size={22} /></Pressable>
          <Pressable accessibilityLabel={`Shopping cart with ${cart.data?.itemCount ?? 0} items`} onPress={() => router.push("/cart")} style={[styles.iconButton, compact && styles.compactIconButton]}><Ionicons color={colors.text} name="cart-outline" size={23} /><View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{Math.min(cart.data?.itemCount ?? 0, 99)}</Text></View></Pressable>
        </View>
      </View>
      {!desktop ? <View style={[styles.mobileSearch, { width: innerWidth }]}><SearchBox compact={compact} loading={suggestionQuery.isFetching} onClearRecent={clearHistory} onDiscoveryTerm={useDiscoveryTerm} onSelect={selectSuggestion} onVoiceResult={voiceSearch} query={query} onChange={setQuery} onSearch={search} recentSearches={recentSearches} suggestions={suggestions} trendingSearches={(trendingQuery.data || []).map((item) => item.query)} /></View> : null}

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

function SearchBox({ compact = false, loading, query, onChange, onClearRecent, onDiscoveryTerm, onSearch, onSelect, onVoiceResult, recentSearches, suggestions, trendingSearches }: { compact?: boolean; loading: boolean; query: string; onChange(value: string): void; onClearRecent(): void; onDiscoveryTerm(value: string): void; onSearch(): void; onSelect(value: SearchSuggestion): void; onVoiceResult(value: string): void; recentSearches: string[]; suggestions: SearchSuggestion[]; trendingSearches: string[] }) {
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const term = query.trim();
  function keyPress(event: NativeSyntheticEvent<TextInputKeyPressEventData>) { if (event.nativeEvent.key === "ArrowDown") setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1)); else if (event.nativeEvent.key === "ArrowUp") setActiveIndex((index) => Math.max(index - 1, -1)); else if (event.nativeEvent.key === "Enter" && activeIndex >= 0 && suggestions[activeIndex]) { onSelect(suggestions[activeIndex]); setFocused(false); } else if (event.nativeEvent.key === "Escape") setFocused(false); }
  return <View style={styles.searchWrap}><View style={styles.searchBar}><Ionicons color={colors.muted} name="search-outline" size={20} /><TextInput accessibilityLabel="Search products" onBlur={() => setTimeout(() => setFocused(false), 160)} onChangeText={(value) => { onChange(value); setActiveIndex(-1); }} onFocus={() => setFocused(true)} onKeyPress={keyPress} onSubmitEditing={() => { if (activeIndex < 0) onSearch(); }} placeholder={compact ? "Search products" : "Search products, brands and shops"} placeholderTextColor="#94a3b8" returnKeyType="search" style={styles.searchInput} value={query} /><VoiceSearchButton onResult={onVoiceResult} /><Pressable accessibilityLabel="Search" onPress={onSearch} style={[styles.searchButton, compact && styles.compactSearchButton]}>{compact ? <Ionicons color={colors.surface} name="arrow-forward" size={18} /> : <Text style={styles.searchButtonText}>Search</Text>}</Pressable></View>{focused ? <View accessibilityLabel="Search suggestions" style={styles.suggestions}>{term.length < 2 ? <DiscoveryTerms onClearRecent={onClearRecent} onSelect={onDiscoveryTerm} recentSearches={recentSearches} trendingSearches={trendingSearches} /> : <>{loading && !suggestions.length ? <View style={styles.suggestionState}><Text style={styles.suggestionMeta}>Finding products...</Text></View> : null}{suggestions.map((suggestion, index) => <Pressable accessibilityRole="link" key={suggestion.id} onPress={() => { onSelect(suggestion); setFocused(false); }} style={[styles.suggestion, activeIndex === index && styles.activeSuggestion]}>{suggestion.image ? <Image source={{ uri: suggestion.image }} style={styles.suggestionImage} /> : <View style={styles.suggestionIcon}><Ionicons color={colors.primary} name={(suggestion.icon || "search-outline") as never} size={18} /></View>}<View style={styles.suggestionCopy}><Text numberOfLines={1} style={styles.suggestionTitle}>{suggestion.title}</Text><Text numberOfLines={1} style={styles.suggestionMeta}>{suggestion.meta}</Text></View><Ionicons color={colors.muted} name="arrow-forward" size={15} /></Pressable>)}{!loading && !suggestions.length ? <Pressable onPress={onSearch} style={styles.suggestionState}><Text style={styles.suggestionTitle}>Search for “{term}”</Text><Text style={styles.suggestionMeta}>See corrected and matching products</Text></Pressable> : null}<Pressable onPress={onSearch} style={styles.allResults}><Text style={styles.allResultsText}>View all results for “{term}”</Text><Ionicons color={colors.accent} name="arrow-forward" size={15} /></Pressable></>}</View> : null}</View>;
}

function DiscoveryTerms({ onClearRecent, onSelect, recentSearches, trendingSearches }: { onClearRecent(): void; onSelect(value: string): void; recentSearches: string[]; trendingSearches: string[] }) {
  const fallback = ["Fresh groceries", "Fashion", "Smartphones", "Village products"];
  return <View style={styles.discoveryPanel}>{recentSearches.length ? <><View style={styles.discoveryHeading}><Text style={styles.discoveryTitle}>Recent searches</Text><Pressable onPress={onClearRecent}><Text style={styles.clearHistory}>Clear</Text></Pressable></View><View style={styles.discoveryChips}>{recentSearches.map((term) => <Pressable key={term} onPress={() => onSelect(term)} style={styles.discoveryChip}><Ionicons color={colors.muted} name="time-outline" size={14} /><Text numberOfLines={1} style={styles.discoveryChipText}>{term}</Text></Pressable>)}</View></> : null}<View style={styles.discoveryHeading}><Text style={styles.discoveryTitle}>Trending searches</Text><Ionicons color={colors.accent} name="trending-up-outline" size={17} /></View><View style={styles.discoveryChips}>{(trendingSearches.length ? trendingSearches : fallback).slice(0, 8).map((term) => <Pressable key={term} onPress={() => onSelect(term)} style={[styles.discoveryChip, styles.trendingChip]}><Ionicons color={colors.accent} name="flame-outline" size={14} /><Text numberOfLines={1} style={styles.discoveryChipText}>{term}</Text></Pressable>)}</View></View>;
}

const menuShadow = Platform.select({ web: { boxShadow: "0 18px 48px rgba(11,31,58,0.18)" }, default: { elevation: 12, shadowColor: colors.navy, shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.18, shadowRadius: 24 } });
const styles = StyleSheet.create({
  shell: { backgroundColor: colors.surface, zIndex: 20 }, openShell: { zIndex: 50 }, utilityStrip: { backgroundColor: colors.navy }, utilityInner: { alignItems: "center", alignSelf: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 32, paddingHorizontal: spacing.sm }, utilityText: { color: "rgba(255,255,255,.82)", fontSize: 11, fontWeight: "600" }, utilityLinks: { flexDirection: "row", gap: spacing.md }, utilityLink: { color: colors.surface, fontSize: 11, fontWeight: "700" }, topRow: { alignItems: "center", alignSelf: "center", flexDirection: "row", justifyContent: "space-between", maxWidth: 1280, minHeight: 64, paddingHorizontal: spacing.sm }, compactTopRow: { minHeight: 58, paddingHorizontal: 6 }, desktopTopRow: { gap: spacing.xl, minHeight: 76 },
  searchWrap: { flex: 1, maxWidth: 720, position: "relative", zIndex: 120 }, searchBar: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.accent, borderRadius: radius.md, borderWidth: 2, flexDirection: "row", overflow: "hidden", paddingLeft: 14, ...Platform.select({ web: { boxShadow: "0 8px 20px rgba(11,31,58,.10)" }, default: { elevation: 2 } }) }, mobileSearch: { alignSelf: "center", marginBottom: 10, maxWidth: 1280, paddingHorizontal: spacing.sm, zIndex: 120 }, searchInput: { color: colors.text, flex: 1, fontSize: 14, height: 46, minWidth: 0, outlineStyle: "none" } as never, searchButton: { alignItems: "center", alignSelf: "stretch", backgroundColor: colors.accent, justifyContent: "center", paddingHorizontal: 24 }, compactSearchButton: { paddingHorizontal: 14 }, searchButtonText: { color: colors.surface, fontSize: 13, fontWeight: "700" },
  suggestions: { backgroundColor: colors.surface, borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md, left: 0, overflow: "hidden", position: "absolute", right: 0, top: 50, zIndex: 150, ...Platform.select({ web: { boxShadow: "0 18px 42px rgba(11,31,58,.18)" }, default: { elevation: 16 } }) }, suggestion: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: spacing.sm, minHeight: 58, paddingHorizontal: spacing.md, paddingVertical: 7 }, activeSuggestion: { backgroundColor: colors.accentSoft }, suggestionImage: { backgroundColor: colors.background, borderRadius: radius.sm, height: 42, width: 42 }, suggestionIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.sm, height: 42, justifyContent: "center", width: 42 }, suggestionCopy: { flex: 1 }, suggestionTitle: { color: colors.text, fontSize: 12, fontWeight: "700" }, suggestionMeta: { color: colors.muted, fontSize: 10, marginTop: 3 }, suggestionState: { paddingHorizontal: spacing.md, paddingVertical: spacing.md }, allResults: { alignItems: "center", backgroundColor: colors.background, flexDirection: "row", justifyContent: "space-between", minHeight: 44, paddingHorizontal: spacing.md }, allResultsText: { color: colors.accent, fontSize: 11, fontWeight: "700" },
  discoveryPanel: { gap: spacing.sm, padding: spacing.md }, discoveryHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, discoveryTitle: { color: colors.text, fontSize: 12, fontWeight: "700" }, clearHistory: { color: colors.primary, fontSize: 11, fontWeight: "700" }, discoveryChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, discoveryChip: { alignItems: "center", backgroundColor: colors.background, borderRadius: radius.pill, flexDirection: "row", gap: 5, maxWidth: "100%", minHeight: 34, paddingHorizontal: 11 }, trendingChip: { backgroundColor: colors.accentSoft }, discoveryChipText: { color: colors.text, flexShrink: 1, fontSize: 11, fontWeight: "600" },
  actions: { alignItems: "center", flexDirection: "row", gap: 6 }, compactActions: { gap: 3 }, iconButton: { alignItems: "center", backgroundColor: colors.background, borderRadius: radius.pill, height: 44, justifyContent: "center", position: "relative", width: 44 }, compactIconButton: { height: 42, width: 42 }, cartBadge: { alignItems: "center", backgroundColor: colors.accent, borderColor: colors.surface, borderRadius: radius.pill, borderWidth: 1, height: 18, justifyContent: "center", position: "absolute", right: -2, top: -2, width: 18 }, cartBadgeText: { color: colors.surface, fontSize: 9, fontWeight: "700" },
  navBorder: { borderBottomColor: colors.border, borderBottomWidth: 1, borderTopColor: colors.border, borderTopWidth: 1 }, desktopNav: { alignItems: "center", alignSelf: "center", flexDirection: "row", gap: 26, minHeight: 48, maxWidth: 1280 }, categoryButton: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: 7, height: 36, paddingHorizontal: 12 }, activeCategoryButton: { backgroundColor: colors.primary, borderColor: colors.primary }, categoryButtonText: { color: colors.primary, fontSize: 13, fontWeight: "700" }, activeCategoryButtonText: { color: colors.surface }, navText: { color: colors.muted, fontSize: 13, fontWeight: "600" }, activeNav: { color: colors.primary }, sellerButton: { alignItems: "center", flexDirection: "row", gap: 5, marginLeft: "auto" }, sellerLink: { color: colors.accent, fontSize: 13, fontWeight: "700" },
  categoryMenu: { alignSelf: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", height: 500, overflow: "hidden", position: "absolute", top: 126, zIndex: 100, ...menuShadow }, menuSidebar: { backgroundColor: colors.background, borderRightColor: colors.border, borderRightWidth: 1, paddingVertical: 12, width: 270 }, rootScroll: { flex: 1 }, allCategories: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 5, marginHorizontal: 12, paddingHorizontal: 12, paddingVertical: 10 }, allCategoriesText: { color: colors.primary, fontSize: 13, fontWeight: "700" }, rootButton: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 43, paddingHorizontal: 20 }, activeRootButton: { backgroundColor: colors.surface }, rootButtonText: { color: colors.text, flex: 1, fontSize: 13, fontWeight: "700" }, activeRootButtonText: { color: colors.primary, fontWeight: "700" },
  menuContent: { flex: 1 }, menuContentInner: { padding: spacing.lg }, menuHeader: { alignItems: "flex-start", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingBottom: spacing.md }, menuHeadingCopy: { flex: 1 }, menuTitle: { color: colors.text, fontSize: 20, fontWeight: "700" }, menuDescription: { color: colors.muted, fontSize: 12, marginTop: 5 }, shopAllButton: { borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8 }, shopAllText: { color: colors.primary, fontSize: 11, fontWeight: "700" }, menuGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg, paddingTop: spacing.lg }, menuColumn: { gap: 8, minWidth: 175, width: "29%" }, menuRoot: { color: colors.text, fontSize: 14, fontWeight: "700" }, menuLeaf: { color: colors.muted, fontSize: 12 }
});
