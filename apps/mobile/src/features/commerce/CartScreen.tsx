import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { getCart, removeCartItem, updateCartItem } from "./commerce.api";

const money = (minor: string) => `৳${(Number(minor) / 100).toLocaleString("en-BD")}`;

export function CartScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = firebaseAuth?.currentUser ?? null;
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cart = useQuery({ queryKey: ["cart"], queryFn: () => getCart(user!), enabled: Boolean(user) });

  async function change(itemId: string, quantity: number) {
    if (!user) return;
    setBusyItem(itemId);
    setError(null);
    try {
      const next = quantity < 1 ? await removeCartItem(user, itemId) : await updateCartItem(user, itemId, quantity);
      queryClient.setQueryData(["cart"], next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update cart");
    } finally {
      setBusyItem(null);
    }
  }

  if (!user) return <Centered title="Your cart is waiting" copy="Sign in to add products and securely check out." action="Sign in" onPress={() => router.replace("/auth")} />;
  if (cart.isLoading) return <Centered loading title="Loading your cart" copy="Checking current prices and availability." />;
  if (cart.error || !cart.data) return <Centered title="Could not load cart" copy={cart.error instanceof Error ? cart.error.message : "Please try again."} action="Try again" onPress={() => cart.refetch()} />;
  if (cart.data.items.length === 0) return <Centered title="Your cart is empty" copy="Explore Amiyo-Go shops and add something you love." action="Start shopping" onPress={() => router.replace("/")} />;

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}><View style={styles.header}><Pressable onPress={() => router.back()}><Text style={styles.link}>‹ Continue shopping</Text></Pressable><Text accessibilityRole="header" style={styles.title}>Shopping cart</Text></View>{error ? <Text style={styles.error}>{error}</Text> : null}<View style={styles.columns}><View style={styles.items}>{cart.data.items.map((item) => <View key={item.id} style={styles.item}><Image source={{ uri: item.thumbnailUrl || "https://placehold.co/160x160/eaf4f8/1e7098?text=Amiyo" }} style={styles.image} /><View style={styles.itemCopy}><Text style={styles.itemName}>{item.productName}</Text><Text style={styles.muted}>{item.variantTitle} · {item.sku}</Text><Text style={styles.price}>{money(item.unitPrice.amountMinor)}</Text><View style={styles.quantity}><Pressable accessibilityLabel={`Decrease ${item.productName} quantity`} disabled={busyItem === item.id} onPress={() => change(item.id, item.quantity - 1)} style={styles.quantityButton}><Ionicons name={item.quantity === 1 ? "trash-outline" : "remove"} size={18} color={colors.text} /></Pressable><Text style={styles.quantityValue}>{busyItem === item.id ? "…" : item.quantity}</Text><Pressable accessibilityLabel={`Increase ${item.productName} quantity`} disabled={busyItem === item.id || item.quantity >= item.availableQuantity} onPress={() => change(item.id, item.quantity + 1)} style={styles.quantityButton}><Ionicons name="add" size={18} color={colors.text} /></Pressable></View></View><Text style={styles.lineTotal}>{money(item.lineTotal.amountMinor)}</Text></View>)}</View><View style={styles.summary}><Text style={styles.summaryTitle}>Order summary</Text><View style={styles.summaryRow}><Text style={styles.muted}>Items ({cart.data.itemCount})</Text><Text style={styles.summaryValue}>{money(cart.data.subtotal.amountMinor)}</Text></View><Text style={styles.note}>Delivery and final total are calculated at checkout.</Text><Pressable onPress={() => router.push("/checkout")} style={styles.primary}><Text style={styles.primaryText}>Proceed to checkout</Text><Ionicons name="arrow-forward" size={19} color="#fff" /></Pressable></View></View></ScrollView></SafeAreaView>;
}

function Centered({ action, copy, loading, onPress, title }: { action?: string; copy: string; loading?: boolean; onPress?: () => void; title: string }) { return <SafeAreaView style={styles.center}>{loading ? <ActivityIndicator color={colors.primary} size="large" /> : <Ionicons name="cart-outline" size={48} color={colors.primary} />}<Text style={styles.centerTitle}>{title}</Text><Text style={styles.centerCopy}>{copy}</Text>{action && onPress ? <Pressable onPress={onPress} style={styles.primary}><Text style={styles.primaryText}>{action}</Text></Pressable> : null}</SafeAreaView>; }

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 }, page: { alignSelf: "center", gap: spacing.lg, maxWidth: 1100, padding: spacing.lg, width: "100%" }, header: { gap: spacing.md }, title: { color: colors.text, fontSize: 30, fontWeight: "900" }, link: { color: colors.primary, fontWeight: "900" }, columns: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.lg }, items: { flex: 2, gap: spacing.md, minWidth: 300 }, item: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md }, image: { backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 88, width: 88 }, itemCopy: { flex: 1, gap: 5 }, itemName: { color: colors.text, fontSize: 16, fontWeight: "900" }, muted: { color: colors.muted }, price: { color: colors.accent, fontWeight: "900" }, lineTotal: { color: colors.text, fontWeight: "900" }, quantity: { alignItems: "center", flexDirection: "row", gap: 10 }, quantityButton: { alignItems: "center", borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, height: 32, justifyContent: "center", width: 32 }, quantityValue: { color: colors.text, fontWeight: "900", minWidth: 20, textAlign: "center" }, summary: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flex: 1, gap: spacing.md, minWidth: 280, padding: spacing.lg }, summaryTitle: { color: colors.text, fontSize: 20, fontWeight: "900" }, summaryRow: { flexDirection: "row", justifyContent: "space-between" }, summaryValue: { color: colors.text, fontWeight: "900" }, note: { color: colors.muted, fontSize: 12, lineHeight: 18 }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.lg }, primaryText: { color: "#fff", fontWeight: "900" }, error: { backgroundColor: "#fef2f2", borderRadius: radius.md, color: colors.danger, padding: spacing.md }, center: { alignItems: "center", backgroundColor: colors.background, flex: 1, gap: spacing.md, justifyContent: "center", padding: spacing.xl }, centerTitle: { color: colors.text, fontSize: 26, fontWeight: "900", textAlign: "center" }, centerCopy: { color: colors.muted, lineHeight: 21, maxWidth: 420, textAlign: "center" }
});
