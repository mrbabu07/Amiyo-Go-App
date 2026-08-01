import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CheckoutResult, PaymentMethod } from "@amiyo/contracts";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { getMyAddresses } from "../auth/auth.api";
import { firebaseAuth } from "../auth/firebase";
import { getCheckoutQuote, placeOrder } from "./commerce.api";

const money = (minor: string) => `৳${(Number(minor) / 100).toLocaleString("en-BD")}`;
const methods: Array<{ value: PaymentMethod; label: string; detail: string }> = [
  { value: "COD", label: "Cash on delivery", detail: "Pay when your order arrives" },
  { value: "BKASH", label: "bKash", detail: "Pay through the secure gateway" },
  { value: "NAGAD", label: "Nagad", detail: "Pay through the secure gateway" },
  { value: "SSLCOMMERZ", label: "Card / mobile banking", detail: "Powered by SSLCommerz" }
];

export function CheckoutScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = firebaseAuth?.currentUser ?? null;
  const [addressId, setAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const addresses = useQuery({ queryKey: ["me", "addresses"], queryFn: () => getMyAddresses(user!), enabled: Boolean(user) });
  const quote = useQuery({ queryKey: ["checkout", "quote"], queryFn: () => getCheckoutQuote(user!), enabled: Boolean(user) });

  useEffect(() => {
    if (!addressId && addresses.data?.length) setAddressId((addresses.data.find((item) => item.isDefault) || addresses.data[0]).id);
  }, [addressId, addresses.data]);

  async function submit() {
    if (!user || !addressId) return;
    setBusy(true);
    setError(null);
    try {
      const order = await placeOrder(user, { addressId, paymentMethod }, Crypto.randomUUID());
      setResult(order);
      queryClient.removeQueries({ queryKey: ["cart"] });
      queryClient.removeQueries({ queryKey: ["checkout"] });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Checkout could not be completed");
    } finally {
      setBusy(false);
    }
  }

  if (!user) return <Centered title="Sign in to checkout" copy="Checkout is currently available to authenticated customers." action="Sign in" onPress={() => router.replace("/auth")} />;
  if (addresses.isLoading || quote.isLoading) return <Centered loading title="Preparing checkout" copy="Confirming inventory and current prices." />;
  const loadError = addresses.error || quote.error;
  if (loadError || !quote.data) return <Centered title="Checkout unavailable" copy={loadError instanceof Error ? loadError.message : "Please return to your cart."} action="Back to cart" onPress={() => router.replace("/cart")} />;
  if (result) return <SafeAreaView style={styles.center}><View style={styles.successIcon}><Ionicons name="checkmark" size={36} color="#fff" /></View><Text accessibilityRole="header" style={styles.centerTitle}>Order placed</Text><Text style={styles.centerCopy}>Order {result.order.orderNumber} is {result.order.status.toLowerCase().replaceAll("_", " ")}.</Text><View style={styles.receipt}><Row label="Total" value={money(result.order.total.amountMinor)} /><Row label="Payment" value={result.payment.status.replaceAll("_", " ")} /><Row label="Invoice" value={result.invoiceNumber} /></View>{result.instructions ? <Text style={styles.notice}>{result.instructions}</Text> : null}{result.actionUrl ? <Pressable onPress={() => Linking.openURL(result.actionUrl!)} style={styles.primary}><Ionicons name="card-outline" size={19} color="#fff" /><Text style={styles.primaryText}>Complete payment</Text></Pressable> : null}<Pressable onPress={() => router.replace("/")}><Text style={styles.link}>Continue shopping</Text></Pressable></SafeAreaView>;

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}><Pressable onPress={() => router.back()}><Text style={styles.link}>‹ Back to cart</Text></Pressable><Text accessibilityRole="header" style={styles.title}>Secure checkout</Text>{error ? <Text style={styles.error}>{error}</Text> : null}<View style={styles.columns}><View style={styles.main}><Section title="Delivery address">{addresses.data?.length ? addresses.data.map((address) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: addressId === address.id }} key={address.id} onPress={() => setAddressId(address.id)} style={[styles.option, addressId === address.id && styles.selected]}><Ionicons name={addressId === address.id ? "radio-button-on" : "radio-button-off"} size={22} color={colors.primary} /><View style={styles.optionCopy}><Text style={styles.optionTitle}>{address.label} · {address.recipientName}</Text><Text style={styles.muted}>{address.line1}, {address.district}, {address.division}</Text><Text style={styles.muted}>{address.phone}</Text></View></Pressable>) : <View style={styles.empty}><Text style={styles.muted}>Add a delivery address before checkout.</Text><Pressable onPress={() => router.push("/account")}><Text style={styles.link}>Add address</Text></Pressable></View>}</Section><Section title="Payment method">{methods.map((method) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: paymentMethod === method.value }} key={method.value} onPress={() => setPaymentMethod(method.value)} style={[styles.option, paymentMethod === method.value && styles.selected]}><Ionicons name={paymentMethod === method.value ? "radio-button-on" : "radio-button-off"} size={22} color={colors.primary} /><View style={styles.optionCopy}><Text style={styles.optionTitle}>{method.label}</Text><Text style={styles.muted}>{method.detail}</Text></View></Pressable>)}</Section></View><View style={styles.summary}><Text style={styles.summaryTitle}>Payment summary</Text><Row label="Subtotal" value={money(quote.data.subtotal.amountMinor)} /><Row label="Discount" value={`-${money(quote.data.discount.amountMinor)}`} /><Row label="Delivery" value={money(quote.data.delivery.amountMinor)} /><Row label="Tax" value={money(quote.data.tax.amountMinor)} /><View style={styles.divider} /><Row label="Total" value={money(quote.data.total.amountMinor)} strong /><Text style={styles.muted}>{quote.data.vendorCount} seller order{quote.data.vendorCount === 1 ? "" : "s"} will be created.</Text><Pressable disabled={busy || !addressId} onPress={submit} style={[styles.primary, (busy || !addressId) && styles.disabled]}>{busy ? <ActivityIndicator color="#fff" /> : <><Ionicons name="lock-closed" size={18} color="#fff" /><Text style={styles.primaryText}>Place order</Text></>}</Pressable></View></View></ScrollView></SafeAreaView>;
}

function Section({ children, title }: { children: React.ReactNode; title: string }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>; }
function Row({ label, strong, value }: { label: string; strong?: boolean; value: string }) { return <View style={styles.row}><Text style={[styles.muted, strong && styles.strong]}>{label}</Text><Text style={[styles.rowValue, strong && styles.strong]}>{value}</Text></View>; }
function Centered({ action, copy, loading, onPress, title }: { action?: string; copy: string; loading?: boolean; onPress?: () => void; title: string }) { return <SafeAreaView style={styles.center}>{loading ? <ActivityIndicator color={colors.primary} size="large" /> : <Ionicons name="shield-checkmark-outline" size={50} color={colors.primary} />}<Text style={styles.centerTitle}>{title}</Text><Text style={styles.centerCopy}>{copy}</Text>{action && onPress ? <Pressable onPress={onPress} style={styles.primary}><Text style={styles.primaryText}>{action}</Text></Pressable> : null}</SafeAreaView>; }

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 }, page: { alignSelf: "center", gap: spacing.md, maxWidth: 1100, padding: spacing.lg, width: "100%" }, title: { color: colors.text, fontSize: 30, fontWeight: "900" }, link: { color: colors.primary, fontWeight: "900" }, columns: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.lg }, main: { flex: 2, gap: spacing.lg, minWidth: 300 }, section: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm, padding: spacing.lg }, sectionTitle: { color: colors.text, fontSize: 19, fontWeight: "900", marginBottom: spacing.sm }, option: { alignItems: "flex-start", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, padding: spacing.md }, selected: { backgroundColor: colors.primarySoft, borderColor: colors.primary }, optionCopy: { flex: 1, gap: 3 }, optionTitle: { color: colors.text, fontWeight: "900" }, muted: { color: colors.muted, lineHeight: 19 }, summary: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flex: 1, gap: spacing.md, minWidth: 280, padding: spacing.lg }, summaryTitle: { color: colors.text, fontSize: 20, fontWeight: "900" }, row: { flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }, rowValue: { color: colors.text, fontWeight: "800", textAlign: "right" }, strong: { color: colors.text, fontSize: 17, fontWeight: "900" }, divider: { borderTopColor: colors.border, borderTopWidth: 1 }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.lg }, primaryText: { color: "#fff", fontWeight: "900" }, disabled: { opacity: 0.5 }, empty: { gap: spacing.sm }, error: { backgroundColor: "#fef2f2", borderRadius: radius.md, color: colors.danger, padding: spacing.md }, center: { alignItems: "center", backgroundColor: colors.background, flex: 1, gap: spacing.md, justifyContent: "center", padding: spacing.xl }, centerTitle: { color: colors.text, fontSize: 28, fontWeight: "900", textAlign: "center" }, centerCopy: { color: colors.muted, lineHeight: 21, maxWidth: 480, textAlign: "center" }, successIcon: { alignItems: "center", backgroundColor: colors.success, borderRadius: radius.pill, height: 68, justifyContent: "center", width: 68 }, receipt: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, maxWidth: 440, padding: spacing.lg, width: "100%" }, notice: { backgroundColor: colors.primarySoft, borderRadius: radius.md, color: colors.primaryDark, maxWidth: 440, padding: spacing.md, width: "100%" }
});
