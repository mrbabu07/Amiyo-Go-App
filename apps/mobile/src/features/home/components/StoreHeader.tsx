import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing } from "../../../ui/tokens";
import { useAuthStore } from "../../auth/auth.store";
import { BrandLogo } from "./BrandLogo";
import { firebaseAuth } from "../../auth/firebase";
import { getCart } from "../../commerce/commerce.api";
import { getCategories } from "../../catalog/catalog.api";
import { buildCategoryTree } from "../../catalog/category-tree";

export function StoreHeader({ desktop, viewportWidth }: { desktop: boolean; viewportWidth: number }) {
  const router = useRouter();
  const hasVendorWorkspace = useAuthStore((state) => Boolean(state.session?.vendorMemberships.length));
  const user = firebaseAuth?.currentUser ?? null;
  const cart = useQuery({ queryKey: ["cart"], queryFn: () => getCart(user!), enabled: Boolean(user) });
  const categories = useQuery({ queryKey: ["catalog", "categories"], queryFn: getCategories, enabled: desktop });
  const [query, setQuery] = useState("");
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const innerWidth = Math.min(viewportWidth - spacing.xl, 1200);
  const search = () => {
    const term = query.trim();
    if (term) router.push(`/search?q=${encodeURIComponent(term)}` as never);
    else Alert.alert("What are you looking for?", "Enter a product, brand, or shop name.");
  };

  return (
    <View style={styles.shell}>
      <View style={[styles.topRow, { width: innerWidth }, desktop && styles.desktopTopRow]}>
        <Pressable onPress={() => router.replace("/")}><BrandLogo /></Pressable>
        {desktop ? <View style={styles.delivery}><Ionicons color={colors.primary} name="location-outline" size={20} /><View><Text style={styles.deliveryLabel}>Deliver to</Text><Text style={styles.deliveryValue}>Dhaka, Bangladesh</Text></View></View> : null}
        <View style={styles.actions}><Pressable accessibilityLabel="My account" onPress={() => router.push("/account")} style={styles.iconButton}><Ionicons color={colors.text} name="person-outline" size={22} /></Pressable><Pressable accessibilityLabel="Notifications" onPress={() => router.push("/notifications")} style={styles.iconButton}><Ionicons color={colors.text} name="notifications-outline" size={22} /></Pressable><Pressable accessibilityLabel={`Shopping cart with ${cart.data?.itemCount ?? 0} items`} onPress={() => router.push("/cart")} style={styles.iconButton}><Ionicons color={colors.text} name="cart-outline" size={23} /><View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{Math.min(cart.data?.itemCount ?? 0, 99)}</Text></View></Pressable></View>
      </View>
      <View style={[styles.searchBar, { width: Math.min(innerWidth, desktop ? 760 : innerWidth) }]}><Ionicons color={colors.muted} name="search-outline" size={20} /><TextInput accessibilityLabel="Search products" onChangeText={setQuery} onSubmitEditing={search} placeholder="Search products, brands and shops" placeholderTextColor="#94a3b8" returnKeyType="search" style={styles.searchInput} value={query} /><Pressable onPress={search} style={styles.searchButton}><Text style={styles.searchButtonText}>Search</Text></Pressable></View>
      {desktop ? <><View style={[styles.desktopNav, { width: innerWidth }]}>{[{ label: "Home", href: "/" }, { label: "Products", href: "/search" }, { label: "Shops", href: "/shops" }].map((item, index) => <Pressable key={item.label} onPress={() => router.push(item.href as never)}><Text style={[styles.navText, index === 0 && styles.activeNav]}>{item.label}</Text></Pressable>)}<Pressable accessibilityRole="button" onPress={() => setCategoriesOpen((open) => !open)} style={styles.categoryButton}><Text style={[styles.navText, categoriesOpen && styles.activeNav]}>Categories</Text><Ionicons color={categoriesOpen ? colors.primary : colors.muted} name={categoriesOpen ? "chevron-up" : "chevron-down"} size={14} /></Pressable><Pressable onPress={() => router.push("/compare")}><Text style={styles.navText}>Compare</Text></Pressable><Pressable onPress={() => router.push(hasVendorWorkspace ? "/vendor/dashboard" : "/vendor/register")} style={styles.sellerButton}><Text style={styles.sellerLink}>{hasVendorWorkspace ? "Seller center" : "Become a seller"}</Text><Ionicons color={colors.accent} name="arrow-forward" size={14} /></Pressable></View>{categoriesOpen ? <View style={[styles.categoryMenu, { width: innerWidth }]}><View style={styles.menuHeader}><Text style={styles.menuTitle}>Shop by department</Text><Pressable onPress={() => { setCategoriesOpen(false); router.push("/categories"); }}><Text style={styles.menuAll}>View all categories →</Text></Pressable></View><View style={styles.menuGrid}>{buildCategoryTree(categories.data || []).map((root) => <View key={root.id} style={styles.menuColumn}><Pressable onPress={() => { setCategoriesOpen(false); router.push(`/category/${root.slug}` as never); }}><Text style={styles.menuRoot}>{root.name}</Text></Pressable>{root.children.slice(0, 7).map((child) => <View key={child.id}><Pressable onPress={() => { setCategoriesOpen(false); router.push(`/category/${child.slug}` as never); }}><Text style={styles.menuChild}>{child.name}</Text></Pressable>{child.children.slice(0, 4).map((leaf) => <Pressable key={leaf.id} onPress={() => { setCategoriesOpen(false); router.push(`/category/${leaf.slug}` as never); }}><Text style={styles.menuLeaf}>{leaf.name}</Text></Pressable>)}</View>)}</View>)}</View></View> : null}</> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, paddingTop: spacing.sm }, topRow: { alignItems: "center", alignSelf: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm, maxWidth: 1200, width: "100%" }, desktopTopRow: { minHeight: 58 },
  delivery: { alignItems: "center", flexDirection: "row", gap: 7, marginLeft: "auto", marginRight: spacing.lg }, deliveryLabel: { color: colors.muted, fontSize: 10 }, deliveryValue: { color: colors.text, fontSize: 12, fontWeight: "800" }, actions: { flexDirection: "row", gap: 5 }, iconButton: { alignItems: "center", borderRadius: radius.md, height: 40, justifyContent: "center", position: "relative", width: 40 },
  cartBadge: { alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.pill, height: 17, justifyContent: "center", position: "absolute", right: 0, top: 0, width: 17 }, cartBadgeText: { color: colors.surface, fontSize: 9, fontWeight: "900" },
  searchBar: { alignItems: "center", alignSelf: "center", backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1.5, flexDirection: "row", marginBottom: 11, overflow: "hidden", paddingLeft: 12 }, searchInput: { color: colors.text, flex: 1, fontSize: 14, height: 45, minWidth: 0, outlineStyle: "none" } as never, searchButton: { alignItems: "center", alignSelf: "stretch", backgroundColor: colors.primary, justifyContent: "center", paddingHorizontal: 18 }, searchButtonText: { color: colors.surface, fontSize: 13, fontWeight: "800" },
  desktopNav: { alignItems: "center", alignSelf: "center", borderTopColor: "#f1f5f9", borderTopWidth: 1, flexDirection: "row", gap: 28, minHeight: 42, maxWidth: 1200, width: "100%" }, navText: { color: colors.muted, fontSize: 13, fontWeight: "700" }, activeNav: { color: colors.primary }, categoryButton: { alignItems: "center", flexDirection: "row", gap: 4 }, categoryMenu: { alignSelf: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.sm, padding: spacing.lg }, menuHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md }, menuTitle: { color: colors.text, fontSize: 18, fontWeight: "900" }, menuAll: { color: colors.primary, fontSize: 12, fontWeight: "900" }, menuGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg }, menuColumn: { flex: 1, gap: 7, minWidth: 170 }, menuRoot: { color: colors.text, fontSize: 15, fontWeight: "900", marginBottom: 3 }, menuChild: { color: colors.primaryDark, fontSize: 12, fontWeight: "800", marginTop: 4 }, menuLeaf: { color: colors.muted, fontSize: 11, marginLeft: spacing.sm, marginTop: 3 }, sellerButton: { alignItems: "center", flexDirection: "row", gap: 5, marginLeft: "auto" }, sellerLink: { color: colors.accent, fontSize: 13, fontWeight: "900" }
});
