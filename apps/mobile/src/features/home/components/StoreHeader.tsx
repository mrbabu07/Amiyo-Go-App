import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing } from "../../../ui/tokens";
import { BrandLogo } from "./BrandLogo";
import { firebaseAuth } from "../../auth/firebase";
import { getCart } from "../../commerce/commerce.api";

export function StoreHeader({ desktop, viewportWidth }: { desktop: boolean; viewportWidth: number }) {
  const router = useRouter();
  const user = firebaseAuth?.currentUser ?? null;
  const cart = useQuery({ queryKey: ["cart"], queryFn: () => getCart(user!), enabled: Boolean(user) });
  const [query, setQuery] = useState("");
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
      {desktop ? <View style={[styles.desktopNav, { width: innerWidth }]}>{[{ label: "Home", href: "/" }, { label: "Products", href: "/search" }, { label: "Shops", href: "/shops" }, { label: "Categories", href: "/categories" }].map((item, index) => <Pressable key={item.label} onPress={() => router.push(item.href as never)}><Text style={[styles.navText, index === 0 && styles.activeNav]}>{item.label}</Text></Pressable>)}<Text style={styles.sellerLink}>Become a seller</Text></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, paddingTop: spacing.sm }, topRow: { alignItems: "center", alignSelf: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm, maxWidth: 1200, width: "100%" }, desktopTopRow: { minHeight: 58 },
  delivery: { alignItems: "center", flexDirection: "row", gap: 7, marginLeft: "auto", marginRight: spacing.lg }, deliveryLabel: { color: colors.muted, fontSize: 10 }, deliveryValue: { color: colors.text, fontSize: 12, fontWeight: "800" }, actions: { flexDirection: "row", gap: 5 }, iconButton: { alignItems: "center", borderRadius: radius.md, height: 40, justifyContent: "center", position: "relative", width: 40 },
  cartBadge: { alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.pill, height: 17, justifyContent: "center", position: "absolute", right: 0, top: 0, width: 17 }, cartBadgeText: { color: colors.surface, fontSize: 9, fontWeight: "900" },
  searchBar: { alignItems: "center", alignSelf: "center", backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1.5, flexDirection: "row", marginBottom: 11, overflow: "hidden", paddingLeft: 12 }, searchInput: { color: colors.text, flex: 1, fontSize: 14, height: 45, minWidth: 0, outlineStyle: "none" } as never, searchButton: { alignItems: "center", alignSelf: "stretch", backgroundColor: colors.primary, justifyContent: "center", paddingHorizontal: 18 }, searchButtonText: { color: colors.surface, fontSize: 13, fontWeight: "800" },
  desktopNav: { alignItems: "center", alignSelf: "center", borderTopColor: "#f1f5f9", borderTopWidth: 1, flexDirection: "row", gap: 28, minHeight: 42, maxWidth: 1200, width: "100%" }, navText: { color: colors.muted, fontSize: 13, fontWeight: "700" }, activeNav: { color: colors.primary }, sellerLink: { color: colors.accent, fontSize: 13, fontWeight: "900", marginLeft: "auto" }
});
