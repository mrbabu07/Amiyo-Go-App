import type { PaymentMethod } from "@amiyo/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { createMyAddress } from "../auth/auth.api";
import { firebaseAuth } from "../auth/firebase";
import { ensureGuestUser } from "../auth/guest-auth";
import { getCheckoutQuote, placeOrder } from "./commerce.api";
import { CouponInput } from "./components/CouponInput";

const money = (minor: string) => `৳${(Number(minor) / 100).toLocaleString("en-BD")}`;
const paymentMethods: Array<{ label: string; value: PaymentMethod }> = [{ label: "Cash on delivery", value: "COD" }, { label: "bKash", value: "BKASH" }, { label: "Nagad", value: "NAGAD" }, { label: "Card / mobile banking", value: "SSLCOMMERZ" }];

export function GuestCheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ couponCode?: string }>();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(firebaseAuth?.currentUser ?? null);
  const [couponCode, setCouponCode] = useState<string | null>(params.couponCode?.toUpperCase() || null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [form, setForm] = useState({ name: "", email: "", phone: "", line1: "", line2: "", division: "Dhaka", district: "", upazila: "", unionName: "", postalCode: "" });
  const [starting, setStarting] = useState(!user);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quote = useQuery({ queryKey: ["checkout", "guest-quote", couponCode, user?.uid], queryFn: () => getCheckoutQuote(user!, couponCode), enabled: Boolean(user) });

  useEffect(() => {
    if (user) return;
    void ensureGuestUser().then(setUser).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Guest checkout is unavailable")).finally(() => setStarting(false));
  }, [user]);

  function update(key: keyof typeof form, value: string) { setForm((current) => ({ ...current, [key]: value })); }
  async function applyCoupon(code: string) { const next = await getCheckoutQuote(user!, code); queryClient.setQueryData(["checkout", "guest-quote", code, user?.uid], next); setCouponCode(code); }
  async function submit() {
    if (!user || !form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.line1.trim() || !form.district.trim()) { setError("Complete all required contact and delivery fields"); return; }
    setBusy(true); setError(null);
    try {
      const address = await createMyAddress(user, { label: "Guest delivery", recipientName: form.name, phone: form.phone, line1: form.line1, line2: form.line2 || null, division: form.division, district: form.district, upazila: form.upazila || null, unionName: form.unionName || null, postalCode: form.postalCode || null, isDefault: true });
      const result = await placeOrder(user, { addressId: address.id, paymentMethod, couponCode }, Crypto.randomUUID());
      queryClient.removeQueries({ queryKey: ["cart"] });
      queryClient.removeQueries({ queryKey: ["checkout"] });
      router.replace({ pathname: "/order-confirmation", params: { orderId: result.order.id, orderNumber: result.order.orderNumber, totalMinor: result.order.total.amountMinor, payment: result.payment.status, invoice: result.invoiceNumber, actionUrl: result.actionUrl || "", instructions: result.instructions || `Guest receipt for ${form.email}` } });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Guest checkout could not be completed"); }
    finally { setBusy(false); }
  }

  if (starting || quote.isLoading) return <Screen eyebrow="GUEST CHECKOUT" title="Preparing secure checkout" description="Creating a protected guest session and confirming current prices."><View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View></Screen>;
  if (!user || quote.error || !quote.data) return <Screen eyebrow="GUEST CHECKOUT" title="Checkout unavailable" description={error || (quote.error instanceof Error ? quote.error.message : "Please return to your cart.")}><View style={styles.center}><Pressable onPress={() => router.replace("/cart")} style={styles.primary}><Text style={styles.primaryText}>Back to cart</Text></Pressable></View></Screen>;

  return <Screen eyebrow="GUEST CHECKOUT" title="Delivery and payment" description="Complete your order without creating a password. This browser keeps access to your order.">
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <View style={styles.columns}><View style={styles.main}>
      <Section title="Contact information"><View style={styles.grid}><Field label="Full name *" value={form.name} onChangeText={(value) => update("name", value)} /><Field keyboardType="email-address" label="Email address *" value={form.email} onChangeText={(value) => update("email", value)} /><Field keyboardType="phone-pad" label="Phone number *" value={form.phone} onChangeText={(value) => update("phone", value)} /></View><Pressable onPress={() => router.push("/login")}><Text style={styles.link}>Already have an account? Sign in</Text></Pressable></Section>
      <Section title="Shipping address"><View style={styles.grid}><Field full label="Address *" value={form.line1} onChangeText={(value) => update("line1", value)} /><Field full label="Apartment / area" value={form.line2} onChangeText={(value) => update("line2", value)} /><Field label="Division *" value={form.division} onChangeText={(value) => update("division", value)} /><Field label="District *" value={form.district} onChangeText={(value) => update("district", value)} /><Field label="Upazila" value={form.upazila} onChangeText={(value) => update("upazila", value)} /><Field label="Union" value={form.unionName} onChangeText={(value) => update("unionName", value)} /><Field label="Postal code" value={form.postalCode} onChangeText={(value) => update("postalCode", value)} /></View></Section>
      <Section title="Payment method">{paymentMethods.map((method) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: method.value === paymentMethod }} key={method.value} onPress={() => setPaymentMethod(method.value)} style={[styles.option, method.value === paymentMethod && styles.selected]}><Ionicons color={colors.primary} name={method.value === paymentMethod ? "radio-button-on" : "radio-button-off"} size={22} /><Text style={styles.optionText}>{method.label}</Text></Pressable>)}</Section>
    </View><View style={styles.summary}><Text style={styles.summaryTitle}>Order summary</Text><CouponInput appliedQuote={quote.data} busy={quote.isFetching} onApply={applyCoupon} onRemove={() => setCouponCode(null)} /><Row label="Subtotal" value={money(quote.data.subtotal.amountMinor)} /><Row label="Discount" value={`-${money(quote.data.discount.amountMinor)}`} /><Row label="Delivery" value={money(quote.data.delivery.amountMinor)} /><View style={styles.divider} /><Row label="Total" strong value={money(quote.data.total.amountMinor)} /><View style={styles.secure}><Ionicons color={colors.success} name="shield-checkmark-outline" size={21} /><Text style={styles.secureText}>Protected guest checkout with authoritative prices and inventory.</Text></View><Pressable disabled={busy} onPress={() => void submit()} style={[styles.primary, busy && styles.disabled]}>{busy ? <ActivityIndicator color="#fff" /> : <><Ionicons color="#fff" name="lock-closed" size={18} /><Text style={styles.primaryText}>Place guest order</Text></>}</Pressable></View></View>
  </Screen>;
}

function Section({ children, title }: { children: React.ReactNode; title: string }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>; }
function Field({ full, label, ...props }: { full?: boolean; label: string } & React.ComponentProps<typeof TextInput>) { return <View style={[styles.field, full && styles.full]}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} /></View>; }
function Row({ label, strong, value }: { label: string; strong?: boolean; value: string }) { return <View style={styles.row}><Text style={[styles.muted, strong && styles.strong]}>{label}</Text><Text style={[styles.value, strong && styles.strong]}>{value}</Text></View>; }

const styles = StyleSheet.create({ columns: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.lg }, main: { flex: 2, gap: spacing.lg, minWidth: 300 }, section: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, padding: spacing.lg }, sectionTitle: { color: colors.text, fontSize: 19, fontWeight: "700" }, grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, field: { flex: 1, gap: 6, minWidth: 210 }, full: { flexBasis: "100%" }, label: { color: colors.text, fontSize: 12, fontWeight: "600" }, input: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 46, paddingHorizontal: spacing.md }, option: { alignItems: "center", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md }, selected: { backgroundColor: colors.primarySoft, borderColor: colors.primary }, optionText: { color: colors.text, fontWeight: "600" }, summary: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flex: 1, gap: spacing.md, minWidth: 290, padding: spacing.lg }, summaryTitle: { color: colors.text, fontSize: 20, fontWeight: "700" }, row: { flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }, muted: { color: colors.muted }, value: { color: colors.text, fontWeight: "600" }, strong: { color: colors.text, fontSize: 17, fontWeight: "700" }, divider: { borderTopColor: colors.border, borderTopWidth: 1 }, secure: { alignItems: "center", backgroundColor: "#ecfdf5", borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.sm }, secureText: { color: "#166534", flex: 1, fontSize: 11 }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.lg }, primaryText: { color: "#fff", fontWeight: "700" }, disabled: { opacity: 0.55 }, link: { color: colors.primary, fontWeight: "600" }, error: { backgroundColor: "#fef2f2", borderRadius: radius.md, color: colors.danger, marginBottom: spacing.md, padding: spacing.md }, center: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.lg, padding: 48 } });
