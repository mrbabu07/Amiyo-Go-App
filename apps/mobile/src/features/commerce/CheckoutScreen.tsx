import type { PaymentMethod } from "@amiyo/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { getMyAddresses } from "../auth/auth.api";
import { firebaseAuth } from "../auth/firebase";
import { getCheckoutQuote, placeOrder } from "./commerce.api";
import { CouponInput } from "./components/CouponInput";

const money = (minor: string) => `৳${(Number(minor) / 100).toLocaleString("en-BD")}`;
const methods: Array<{ value: PaymentMethod; label: string; detail: string; icon: string }> = [
  { value: "COD", label: "Cash on delivery", detail: "Pay when your order arrives", icon: "cash-outline" },
  { value: "BKASH", label: "bKash", detail: "Pay through the secure gateway", icon: "phone-portrait-outline" },
  { value: "NAGAD", label: "Nagad", detail: "Pay through the secure gateway", icon: "phone-portrait-outline" },
  { value: "SSLCOMMERZ", label: "Card / mobile banking", detail: "Powered by SSLCommerz", icon: "card-outline" }
];

export function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ couponCode?: string }>();
  const queryClient = useQueryClient();
  const user = firebaseAuth?.currentUser ?? null;
  const [addressId, setAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [couponCode, setCouponCode] = useState<string | null>(params.couponCode?.toUpperCase() || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addresses = useQuery({ queryKey: ["me", "addresses"], queryFn: () => getMyAddresses(user!), enabled: Boolean(user) });
  const quote = useQuery({ queryKey: ["checkout", "quote", couponCode], queryFn: () => getCheckoutQuote(user!, couponCode), enabled: Boolean(user) });

  useEffect(() => { if (!addressId && addresses.data?.length) setAddressId((addresses.data.find((item) => item.isDefault) || addresses.data[0]!).id); }, [addressId, addresses.data]);
  async function applyCoupon(code: string) { const next = await getCheckoutQuote(user!, code); queryClient.setQueryData(["checkout", "quote", code], next); setCouponCode(code); }
  async function submit() {
    if (!user || !addressId) return;
    setBusy(true); setError(null);
    try {
      const result = await placeOrder(user, { addressId, paymentMethod, couponCode }, Crypto.randomUUID());
      queryClient.removeQueries({ queryKey: ["cart"] });
      queryClient.removeQueries({ queryKey: ["checkout"] });
      router.replace({ pathname: "/order-confirmation", params: { orderId: result.order.id, orderNumber: result.order.orderNumber, totalMinor: result.order.total.amountMinor, payment: result.payment.status, invoice: result.invoiceNumber, actionUrl: result.actionUrl || "", instructions: result.instructions || "" } });
    }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Checkout could not be completed"); }
    finally { setBusy(false); }
  }

  if (!user) return <Centered title="Sign in to checkout" copy="Checkout is currently available to authenticated customers." action="Sign in" onPress={() => router.replace("/auth")} />;
  if (addresses.isLoading || quote.isLoading) return <Centered loading title="Preparing checkout" copy="Confirming inventory and current prices." />;
  const loadError = addresses.error || quote.error;
  if (loadError || !quote.data) return <Centered title="Checkout unavailable" copy={loadError instanceof Error ? loadError.message : "Please return to your cart."} action="Back to cart" onPress={() => router.replace("/cart")} />;
  return <Screen eyebrow="SECURE CHECKOUT" title="Delivery and payment" description="Confirm your delivery address and preferred payment method.">
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <View style={styles.steps}><Step complete icon="cart-outline" label="Cart" /><View style={styles.stepLineActive} /><Step active icon="location-outline" label="Delivery" /><View style={styles.stepLine} /><Step icon="card-outline" label="Payment" /></View>
    <View style={styles.columns}><View style={styles.main}>
      <Section index="1" title="Delivery address">{addresses.data?.length ? addresses.data.map((address) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: addressId === address.id }} key={address.id} onPress={() => setAddressId(address.id)} style={[styles.option, addressId === address.id && styles.selected]}><Ionicons name={addressId === address.id ? "radio-button-on" : "radio-button-off"} size={22} color={colors.primary} /><View style={styles.optionCopy}><Text style={styles.optionTitle}>{address.label} · {address.recipientName}</Text><Text style={styles.muted}>{[address.line1, address.line2, address.unionName, address.upazila, address.district, address.division].filter(Boolean).join(", ")}</Text><Text style={styles.muted}>{address.phone}</Text></View>{address.isDefault ? <Text style={styles.defaultBadge}>DEFAULT</Text> : null}</Pressable>) : <View style={styles.empty}><Text style={styles.muted}>Add a delivery address before checkout.</Text><Pressable onPress={() => router.push("/addresses")}><Text style={styles.link}>Add address</Text></Pressable></View>}</Section>
      <Section index="2" title="Payment method">{methods.map((method) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: paymentMethod === method.value }} key={method.value} onPress={() => setPaymentMethod(method.value)} style={[styles.option, paymentMethod === method.value && styles.selected]}><View style={styles.paymentIcon}><Ionicons color={colors.primary} name={method.icon as never} size={21} /></View><View style={styles.optionCopy}><Text style={styles.optionTitle}>{method.label}</Text><Text style={styles.muted}>{method.detail}</Text></View><Ionicons name={paymentMethod === method.value ? "radio-button-on" : "radio-button-off"} size={22} color={colors.primary} /></Pressable>)}</Section>
    </View><View style={styles.summary}><Text style={styles.summaryTitle}>Payment summary</Text><CouponInput appliedQuote={quote.data} busy={quote.isFetching} onApply={applyCoupon} onRemove={() => setCouponCode(null)} /><Row label="Subtotal" value={money(quote.data.subtotal.amountMinor)} /><Row label={quote.data.coupon ? `Coupon (${quote.data.coupon.code})` : "Discount"} value={`-${money(quote.data.discount.amountMinor)}`} /><Row label="Delivery" value={money(quote.data.delivery.amountMinor)} /><Row label="Tax" value={money(quote.data.tax.amountMinor)} /><View style={styles.divider} /><Row label="Total" value={money(quote.data.total.amountMinor)} strong /><Text style={styles.muted}>{quote.data.vendorCount} seller order{quote.data.vendorCount === 1 ? "" : "s"} will be created.</Text><View style={styles.secure}><Ionicons color={colors.success} name="shield-checkmark-outline" size={20} /><Text style={styles.secureText}>Your checkout is encrypted and protected.</Text></View><Pressable disabled={busy || !addressId} onPress={submit} style={[styles.primary, (busy || !addressId) && styles.disabled]}>{busy ? <ActivityIndicator color={colors.surface} /> : <><Ionicons name="lock-closed" size={18} color={colors.surface} /><Text style={styles.primaryText}>Place order</Text></>}</Pressable></View></View>
  </Screen>;
}

function Step({ active, complete, icon, label }: { active?: boolean; complete?: boolean; icon: string; label: string }) { const highlighted = active || complete; return <View style={styles.step}><View style={[styles.stepIcon, highlighted && styles.stepIconActive]}><Ionicons color={highlighted ? colors.surface : colors.muted} name={(complete ? "checkmark" : icon) as never} size={17} /></View><Text style={[styles.stepLabel, highlighted && styles.stepLabelActive]}>{label}</Text></View>; }
function Section({ children, index, title }: { children: React.ReactNode; index: string; title: string }) { return <View style={styles.section}><View style={styles.sectionHeading}><View style={styles.sectionIndex}><Text style={styles.sectionIndexText}>{index}</Text></View><Text style={styles.sectionTitle}>{title}</Text></View>{children}</View>; }
function Row({ label, strong, value }: { label: string; strong?: boolean; value: string }) { return <View style={styles.row}><Text style={[styles.muted, strong && styles.strong]}>{label}</Text><Text style={[styles.rowValue, strong && styles.strong]}>{value}</Text></View>; }
function Centered({ action, copy, loading, onPress, title }: { action?: string; copy: string; loading?: boolean; onPress?: () => void; title: string }) { return <Screen eyebrow="CHECKOUT" title={title} description={copy}><View style={styles.centerCard}>{loading ? <ActivityIndicator color={colors.primary} size="large" /> : <Ionicons name="shield-checkmark-outline" size={50} color={colors.primary} />}{action && onPress ? <Pressable onPress={onPress} style={styles.primary}><Text style={styles.primaryText}>{action}</Text></Pressable> : null}</View></Screen>; }

const styles = StyleSheet.create({ steps: { alignItems: "center", alignSelf: "center", flexDirection: "row", marginBottom: spacing.sm, maxWidth: 480, width: "100%" }, step: { alignItems: "center", gap: 5 }, stepIcon: { alignItems: "center", backgroundColor: colors.border, borderRadius: radius.pill, height: 34, justifyContent: "center", width: 34 }, stepIconActive: { backgroundColor: colors.primary }, stepLabel: { color: colors.muted, fontSize: 10, fontWeight: "600" }, stepLabelActive: { color: colors.primary }, stepLine: { backgroundColor: colors.border, flex: 1, height: 2, marginBottom: 17 }, stepLineActive: { backgroundColor: colors.primary, flex: 1, height: 2, marginBottom: 17 }, columns: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.lg }, main: { flex: 2, gap: spacing.lg, minWidth: 300 }, section: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm, padding: spacing.lg }, sectionHeading: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: 10, marginBottom: spacing.sm, paddingBottom: spacing.md }, sectionIndex: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.pill, height: 28, justifyContent: "center", width: 28 }, sectionIndexText: { color: colors.surface, fontSize: 12, fontWeight: "700" }, sectionTitle: { color: colors.text, fontSize: 19, fontWeight: "700" }, option: { alignItems: "center", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, padding: spacing.md }, selected: { backgroundColor: colors.primarySoft, borderColor: colors.primary }, optionCopy: { flex: 1, gap: 3 }, optionTitle: { color: colors.text, fontWeight: "700" }, defaultBadge: { backgroundColor: "#dcfce7", borderRadius: 4, color: colors.success, fontSize: 8, fontWeight: "700", paddingHorizontal: 6, paddingVertical: 4 }, paymentIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 40, justifyContent: "center", width: 40 }, empty: { alignItems: "center", gap: spacing.sm, padding: spacing.lg }, summary: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flex: 1, gap: spacing.md, minWidth: 290, padding: spacing.lg }, summaryTitle: { color: colors.text, fontSize: 20, fontWeight: "700" }, row: { flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }, rowValue: { color: colors.text, fontWeight: "600" }, strong: { color: colors.text, fontSize: 17, fontWeight: "700" }, divider: { borderTopColor: colors.border, borderTopWidth: 1 }, muted: { color: colors.muted, lineHeight: 19 }, secure: { alignItems: "center", backgroundColor: "#ecfdf5", borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.sm }, secureText: { color: "#166534", flex: 1, fontSize: 11 }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.lg }, primaryText: { color: colors.surface, fontWeight: "700" }, disabled: { opacity: 0.5 }, link: { color: colors.primary, fontWeight: "700" }, error: { backgroundColor: "#fef2f2", borderRadius: radius.md, color: colors.danger, padding: spacing.md }, centerCard: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderStyle: "dashed", borderWidth: 1, gap: spacing.lg, padding: 44 }, successPanel: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, gap: spacing.lg, padding: spacing.xl }, successIcon: { alignItems: "center", backgroundColor: colors.success, borderRadius: radius.pill, height: 68, justifyContent: "center", width: 68 }, receipt: { gap: spacing.md, maxWidth: 440, width: "100%" }, notice: { backgroundColor: colors.primarySoft, borderRadius: radius.md, color: colors.primaryDark, maxWidth: 440, padding: spacing.md, width: "100%" } });
