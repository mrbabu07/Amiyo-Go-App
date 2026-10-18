import type { CheckoutQuote } from "@amiyo/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { ensureGuestUser } from "../auth/guest-auth";
import { useCurrentUser } from "../auth/use-current-user";
import { fallbackProductImage } from "../catalog/catalog.view-model";
import { getCart, getCheckoutQuote, removeCartItem, updateCartItem } from "./commerce.api";
import { CouponInput } from "./components/CouponInput";

const money = (minor: string) => `৳${(Number(minor) / 100).toLocaleString("en-BD")}`;

export function CartScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const compact = useWindowDimensions().width < 620;
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [couponQuote, setCouponQuote] = useState<CheckoutQuote | null>(null);
  const cart = useQuery({ queryKey: ["cart", user?.uid ?? null], queryFn: () => getCart(user!), enabled: Boolean(user) });
  const coupon = useMutation({ mutationFn: (code: string) => getCheckoutQuote(user!, code), onSuccess: setCouponQuote });

  async function change(itemId: string, quantity: number) {
    if (!user) return;
    setBusyItem(itemId);
    setError(null);
    setCouponQuote(null);
    try {
      queryClient.setQueryData(["cart", user.uid], quantity < 1 ? await removeCartItem(user, itemId) : await updateCartItem(user, itemId, quantity));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update cart");
    } finally {
      setBusyItem(null);
    }
  }

  if (!user) return <Screen eyebrow="CART" title="Your cart is waiting" description="Sign in for a saved account or continue securely as a guest."><View style={[styles.centerCard, premiumStyles.centerCard]}><Ionicons name="cart-outline" size={48} color={colors.primary} /><Pressable onPress={() => router.replace("/auth")} style={styles.primary}><Text style={styles.primaryText}>Sign in</Text></Pressable><Pressable onPress={() => { void ensureGuestUser().then(() => router.replace("/products")).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Guest checkout is unavailable")); }} style={styles.guestButton}><Text style={styles.guestText}>Continue as guest</Text></Pressable>{error ? <Text style={styles.error}>{error}</Text> : null}</View></Screen>;
  if (cart.isLoading) return <Centered loading title="Loading your cart" copy="Checking current prices and availability." />;
  if (cart.error || !cart.data) return <Centered title="Could not load cart" copy={cart.error instanceof Error ? cart.error.message : "Please try again."} action="Try again" onPress={() => cart.refetch()} />;
  if (!cart.data.items.length) return <Centered title="Your cart is empty" copy="Explore Amiyo-Go shops and add something you love." action="Start shopping" onPress={() => router.replace("/")} />;

  const checkoutBase = user.isAnonymous ? "/checkout/guest" : "/checkout";
  const checkoutHref = couponQuote?.coupon ? `${checkoutBase}?couponCode=${encodeURIComponent(couponQuote.coupon.code)}` : checkoutBase;

  return <Screen eyebrow="YOUR BAG" title="Shopping cart" description="Review quantities and continue to secure checkout.">
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <View style={styles.steps}><Step active icon="cart-outline" label="Cart" /><View style={styles.stepLine} /><Step icon="location-outline" label="Delivery" /><View style={styles.stepLine} /><Step icon="card-outline" label="Payment" /></View>
    <View style={[styles.columns, compact && styles.columnsCompact]}>
      <View style={[styles.items, compact && styles.itemsCompact]}>{cart.data.items.map((item) => <View key={item.id} style={[styles.item, premiumStyles.item, compact && styles.itemCompact]}>
        <Image source={{ uri: item.thumbnailUrl || fallbackProductImage }} style={[styles.image, compact && styles.imageCompact]} />
        <View style={styles.itemCopy}><Text numberOfLines={2} style={styles.itemName}>{item.productName}</Text><Text style={styles.muted}>{item.variantTitle} · {item.sku}</Text><Text style={styles.price}>{money(item.unitPrice.amountMinor)}</Text><View style={styles.quantity}><Pressable accessibilityLabel={`Decrease ${item.productName} quantity`} disabled={busyItem === item.id} onPress={() => change(item.id, item.quantity - 1)} style={[styles.quantityButton, premiumStyles.quantityButton]}><Ionicons name={item.quantity === 1 ? "trash-outline" : "remove"} size={18} color={colors.text} /></Pressable><Text style={styles.quantityValue}>{busyItem === item.id ? "…" : item.quantity}</Text><Pressable accessibilityLabel={`Increase ${item.productName} quantity`} disabled={busyItem === item.id || item.quantity >= item.availableQuantity} onPress={() => change(item.id, item.quantity + 1)} style={[styles.quantityButton, premiumStyles.quantityButton]}><Ionicons name="add" size={18} color={colors.text} /></Pressable></View></View>
        <Text style={[styles.lineTotal, compact && premiumStyles.lineTotalCompact]}>{money(item.lineTotal.amountMinor)}</Text>
      </View>)}</View>
      <View style={[styles.summary, premiumStyles.summary, compact && styles.summaryCompact]}><Text accessibilityRole="header" style={styles.summaryTitle}>Order summary</Text><View style={styles.summaryRow}><Text style={styles.muted}>Items ({cart.data.itemCount})</Text><Text style={styles.summaryValue}>{money(cart.data.subtotal.amountMinor)}</Text></View>{couponQuote?.coupon ? <View style={styles.summaryRow}><Text style={styles.discount}>Coupon discount</Text><Text style={styles.discount}>-{money(couponQuote.discount.amountMinor)}</Text></View> : null}<View style={styles.divider} /><CouponInput appliedQuote={couponQuote} busy={coupon.isPending} onApply={async (code) => { await coupon.mutateAsync(code); }} onRemove={() => setCouponQuote(null)} /><View style={[styles.secureRow, premiumStyles.secureRow]}><Ionicons color={colors.success} name="shield-checkmark-outline" size={20} /><Text style={styles.note}>Secure checkout with protected payment processing.</Text></View><Pressable onPress={() => router.push(checkoutHref as never)} style={styles.primary}><Text style={styles.primaryText}>Proceed to checkout</Text><Ionicons name="arrow-forward" size={19} color={colors.surface} /></Pressable><Pressable onPress={() => router.push("/")}><Text style={styles.continue}>Continue shopping</Text></Pressable></View>
    </View>
  </Screen>;
}

function Step({ active, icon, label }: { active?: boolean; icon: React.ComponentProps<typeof Ionicons>["name"]; label: string }) { return <View style={styles.step}><View style={[styles.stepIcon, active && styles.stepIconActive]}><Ionicons color={active ? colors.surface : colors.muted} name={icon} size={17} /></View><Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text></View>; }
function Centered({ action, copy, loading, onPress, title }: { action?: string; copy: string; loading?: boolean; onPress?: () => void; title: string }) { return <Screen eyebrow="CART" title={title} description={copy}><View style={[styles.centerCard, premiumStyles.centerCard]}>{loading ? <ActivityIndicator color={colors.primary} size="large" /> : <Ionicons name="cart-outline" size={48} color={colors.primary} />}{action && onPress ? <Pressable onPress={onPress} style={styles.primary}><Text style={styles.primaryText}>{action}</Text></Pressable> : null}</View></Screen>; }

const styles = StyleSheet.create({
  steps: { alignItems: "center", alignSelf: "center", flexDirection: "row", marginBottom: spacing.sm, maxWidth: 480, width: "100%" }, step: { alignItems: "center", gap: 5 }, stepIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 34, justifyContent: "center", width: 34 }, stepIconActive: { backgroundColor: colors.primary }, stepLabel: { color: colors.muted, fontSize: 10, fontWeight: "600" }, stepLabelActive: { color: colors.primary }, stepLine: { backgroundColor: colors.border, flex: 1, height: 2, marginBottom: 17 }, columns: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.lg }, columnsCompact: { flexDirection: "column" }, items: { flex: 2, gap: spacing.md, minWidth: 300 }, itemsCompact: { minWidth: 0, width: "100%" }, item: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, flexDirection: "row", gap: spacing.md, padding: spacing.md }, itemCompact: { alignItems: "flex-start", flexWrap: "wrap", gap: spacing.sm }, image: { backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 96, width: 96 }, imageCompact: { height: 84, width: 84 }, itemCopy: { flex: 1, gap: 5, minWidth: 150 }, itemName: { color: colors.text, fontSize: 16, fontWeight: "700" }, muted: { color: colors.muted }, price: { color: colors.primary, fontWeight: "700" }, lineTotal: { color: colors.text, fontWeight: "700" }, lineTotalCompact: { paddingLeft: 96, textAlign: "right", width: "100%" }, quantity: { alignItems: "center", flexDirection: "row", gap: 10 }, quantityButton: { alignItems: "center", borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, height: 34, justifyContent: "center", width: 34 }, quantityValue: { color: colors.text, fontWeight: "700", minWidth: 20, textAlign: "center" }, summary: { backgroundColor: colors.surface, borderColor: colors.accentSoft, borderRadius: radius.md, borderWidth: 1, flex: 1, gap: spacing.md, minWidth: 280, padding: spacing.lg }, summaryCompact: { minWidth: 0, width: "100%" }, summaryTitle: { color: colors.text, fontSize: 20, fontWeight: "700" }, summaryRow: { flexDirection: "row", justifyContent: "space-between" }, summaryValue: { color: colors.text, fontWeight: "700" }, discount: { color: colors.success, fontWeight: "700" }, divider: { borderTopColor: colors.border, borderTopWidth: 1 }, secureRow: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.sm }, note: { color: colors.muted, flex: 1, fontSize: 12, lineHeight: 18 }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 50, paddingHorizontal: spacing.lg }, primaryText: { color: colors.surface, fontWeight: "700" }, guestButton: { borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.lg }, guestText: { color: colors.primary, fontWeight: "700" }, continue: { color: colors.primary, fontSize: 12, fontWeight: "700", textAlign: "center" }, error: { backgroundColor: colors.primarySoft, borderRadius: radius.md, color: colors.danger, padding: spacing.md }, centerCard: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderStyle: "dashed", borderWidth: 1, gap: spacing.lg, padding: 44 }
});

const premiumStyles = StyleSheet.create({ item: { borderRadius: radius.xl, boxShadow: "0 8px 24px rgba(11,31,58,.07)" }, quantityButton: { height: 44, width: 44 }, lineTotalCompact: { alignSelf: "flex-end", paddingLeft: 0, textAlign: "right", width: "auto" }, summary: { borderWidth: 0, borderRadius: radius.xl, boxShadow: "0 12px 34px rgba(11,31,58,.10)" }, secureRow: { backgroundColor: colors.accentSoft }, centerCard: { borderWidth: 0, boxShadow: "0 10px 30px rgba(11,31,58,.08)" } });
