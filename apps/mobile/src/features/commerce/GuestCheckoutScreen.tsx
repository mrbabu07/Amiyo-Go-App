import type { PaymentMethod } from "@amiyo/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { formatMinor } from "../../ui/money";
import { colors, radius, spacing } from "../../ui/tokens";
import { createMyAddress } from "../auth/auth.api";
import { useCurrentUser } from "../auth/use-current-user";
import { createCheckoutAttempt } from "./checkout-attempt";
import { ensureGuestUser } from "../auth/guest-auth";
import { getCheckoutQuote, getPendingCheckout, placeOrder } from "./commerce.api";
import { CheckoutRecovery } from "./CheckoutRecovery";
import { CouponInput } from "./components/CouponInput";
import { getPublicPlatformSettings } from "../platform/platform.api";
import { checkoutPolicyError, paymentMethodEnabled } from "./checkout-policy";

const money = (minor: string) => formatMinor(minor);
const paymentMethods: Array<{ label: string; value: PaymentMethod }> = [{ label: "Cash on delivery", value: "COD" }, { label: "Card / mobile banking", value: "SSLCOMMERZ" }];

export function GuestCheckoutScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 768;
  const router = useRouter();
  const params = useLocalSearchParams<{ couponCode?: string }>();
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;
  const recovery = useQuery({ queryKey: ["checkout-recovery", user?.uid], queryFn: () => getPendingCheckout(user!), enabled: Boolean(user), staleTime: 0, retry: false });
  const submitLock = useRef(false);
  const attempt = useRef(createCheckoutAttempt<Awaited<ReturnType<typeof placeOrder>>>(() => Crypto.randomUUID()));
  const deliveryAddresses = useRef(new Map<string, string>());
  const [couponCode, setCouponCode] = useState<string | null>(params.couponCode?.toUpperCase() || null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [codPhoneConfirmed, setCodPhoneConfirmed] = useState(false);
  const platform = useQuery({ queryKey: ["platform", "public-settings"], queryFn: getPublicPlatformSettings, staleTime: 5 * 60_000 });
  const [form, setForm] = useState({ name: "", email: "", phone: "", line1: "", line2: "", division: "Dhaka", district: "", upazila: "", unionName: "", postalCode: "" });
  const [starting, setStarting] = useState(!user);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const availableMethods = paymentMethods.filter((method) => paymentMethodEnabled(platform.data, method.value));
  const village = platform.data?.villageOperations;
  const policyError = checkoutPolicyError(platform.error ? undefined : platform.data, paymentMethod, codPhoneConfirmed, form);
  const submitDisabled = busy || Boolean(policyError);
  const quote = useQuery({ queryKey: ["checkout", "guest-quote", couponCode, user?.uid], queryFn: () => getCheckoutQuote(user!, couponCode), enabled: Boolean(user) });

  useEffect(() => {
    if (user) { setStarting(false); return; }
    setStarting(true);
    void ensureGuestUser().catch((caught: unknown) => { if (!activeUid.current) setError(caught instanceof Error ? caught.message : "Guest checkout is unavailable"); }).finally(() => { if (!activeUid.current) setStarting(false); });
  }, [user]);
  useEffect(() => { setCodPhoneConfirmed(false); setCouponCode(params.couponCode?.toUpperCase() || null); setError(null); submitLock.current = false; deliveryAddresses.current.clear(); }, [user?.uid]);

  function update(key: keyof typeof form, value: string) { if (key === "phone") setCodPhoneConfirmed(false); setForm((current) => ({ ...current, [key]: value })); }
  async function applyCoupon(code: string) { if (!user) return; const ownerUid = user.uid; const next = await getCheckoutQuote(user, code); if (activeUid.current !== ownerUid) return; queryClient.setQueryData(["checkout", "guest-quote", code, ownerUid], next); setCouponCode(code); }
  async function submit() {
    if (submitLock.current) return;
    if (policyError) { setError(policyError); return; }
    if (!user || !form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.line1.trim() || !form.district.trim()) { setError("Complete all required contact and delivery fields"); return; }
    submitLock.current = true;
    setBusy(true); setError(null);
    const ownerUid = user.uid;
    try {
      const addressIdentity = JSON.stringify([user.uid, form]);
      const result = await attempt.current(JSON.stringify([addressIdentity, paymentMethod, couponCode, codPhoneConfirmed]), async (key) => {
        let addressId = deliveryAddresses.current.get(addressIdentity);
        if (!addressId) {
          const address = await createMyAddress(user, { label: "Guest delivery", recipientName: form.name, phone: form.phone, line1: form.line1, line2: form.line2 || null, division: form.division, district: form.district, upazila: form.upazila || null, unionName: form.unionName || null, postalCode: form.postalCode || null, isDefault: true });
          addressId = address.id;
          deliveryAddresses.current.set(addressIdentity, addressId);
        }
        if (activeUid.current !== ownerUid) throw new Error("Account changed. Reopen checkout before continuing.");
        return placeOrder(user, { addressId, paymentMethod, couponCode, loyaltyPoints: "0", codPhoneConfirmed }, key);
      });
      if (activeUid.current !== ownerUid) return;
      queryClient.removeQueries({ queryKey: ["cart", ownerUid] });
      queryClient.removeQueries({ queryKey: ["checkout", "guest-quote"] });
      router.replace({ pathname: "/order-confirmation", params: { orderId: result.order.id, orderNumber: result.order.orderNumber, totalMinor: result.order.total.amountMinor, payment: result.payment.status, invoice: result.invoiceNumber, actionUrl: result.actionUrl || "", instructions: result.instructions || `Guest receipt for ${form.email}` } });
    } catch (caught) { if (activeUid.current === ownerUid) setError(caught instanceof Error ? caught.message : "Guest checkout could not be completed"); }
    finally { submitLock.current = false; if (activeUid.current === ownerUid) setBusy(false); }
  }

  if (user && recovery.error) return <Screen eyebrow="CHECKOUT RECOVERY" title="Check your orders first" description={recovery.error.message}><Pressable onPress={() => router.push("/orders")} style={styles.primary}><Text style={styles.primaryText}>View my orders</Text></Pressable></Screen>;
  if (user && recovery.data) return <CheckoutRecovery user={user} pending={recovery.data} />;
  if (starting || quote.isLoading || (user && recovery.isPending)) return <Screen eyebrow="GUEST CHECKOUT" title="Preparing secure checkout" description="Creating a protected guest session and confirming current prices."><View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View></Screen>;
  if (!user || quote.error || !quote.data) return <Screen eyebrow="GUEST CHECKOUT" title="Checkout unavailable" description={error || (quote.error instanceof Error ? quote.error.message : "Please return to your cart.")}><View style={styles.center}><Pressable onPress={() => router.replace("/cart")} style={styles.primary}><Text style={styles.primaryText}>Back to cart</Text></Pressable></View></Screen>;

  return <Screen eyebrow="GUEST CHECKOUT" title="Delivery and payment" description="Complete your order without creating a password. This browser keeps access to your order.">
    {error || policyError ? <Text accessibilityRole="alert" style={styles.error}>{error || policyError}</Text> : null}
    {platform.error ? <Pressable accessibilityRole="button" onPress={() => void platform.refetch()} style={styles.primary}><Text style={styles.primaryText}>Retry marketplace settings</Text></Pressable> : null}
    <View style={styles.columns}><View style={[styles.main, compact && { flex: 0, width: "100%", minWidth: 0 }]}>
      <Section title="Contact information"><View style={styles.grid}><Field label="Full name *" value={form.name} onChangeText={(value) => update("name", value)} /><Field keyboardType="email-address" label="Email address *" value={form.email} onChangeText={(value) => update("email", value)} /><Field keyboardType="phone-pad" label="Phone number *" value={form.phone} onChangeText={(value) => update("phone", value)} /></View><Pressable onPress={() => router.push("/login")}><Text style={styles.link}>Already have an account? Sign in</Text></Pressable></Section>
      <Section title="Shipping address"><View style={styles.grid}><Field full label="Address *" value={form.line1} onChangeText={(value) => update("line1", value)} /><Field full label="Apartment / area" value={form.line2} onChangeText={(value) => update("line2", value)} /><Field label="Division *" value={form.division} onChangeText={(value) => update("division", value)} /><Field label="District *" value={form.district} onChangeText={(value) => update("district", value)} /><Field label={village?.enabled && village.requireUnionForDelivery ? "Upazila *" : "Upazila"} value={form.upazila} onChangeText={(value) => update("upazila", value)} /><Field label={village?.enabled && village.requireUnionForDelivery ? "Union *" : "Union"} value={form.unionName} onChangeText={(value) => update("unionName", value)} /><Field label="Postal code" value={form.postalCode} onChangeText={(value) => update("postalCode", value)} /></View></Section>
      <Section title="Payment method">{availableMethods.map((method) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: method.value === paymentMethod }} key={method.value} onPress={() => { setPaymentMethod(method.value); setCodPhoneConfirmed(false); }} style={[styles.option, premiumStyles.option, method.value === paymentMethod && styles.selected]}><Ionicons color={colors.primary} name={method.value === paymentMethod ? "radio-button-on" : "radio-button-off"} size={22} /><Text style={styles.optionText}>{method.label}</Text></Pressable>)}</Section>
      {paymentMethod === "COD" && village?.enabled && village.requireCodPhoneConfirmation ? <Pressable accessibilityRole="checkbox" accessibilityLabel="My delivery phone is active" accessibilityState={{ checked: codPhoneConfirmed }} onPress={() => setCodPhoneConfirmed((value) => !value)} style={[styles.option, premiumStyles.option, codPhoneConfirmed && styles.selected]}><Ionicons color={colors.primary} name={codPhoneConfirmed ? "checkbox" : "square-outline"} size={22} /><Text style={[styles.optionText, { flex: 1 }]}>My delivery phone is active. The delivery team may call before dispatch.</Text></Pressable> : null}
    </View><View style={[styles.summary, premiumStyles.summary, compact && { flex: 0, width: "100%", minWidth: 0 }]}><Text style={styles.summaryTitle}>Order summary</Text><CouponInput appliedQuote={quote.data} busy={quote.isFetching} onApply={applyCoupon} onRemove={() => setCouponCode(null)} /><Row label="Subtotal" value={money(quote.data.subtotal.amountMinor)} /><Row label="Discount" value={`-${money(quote.data.discount.amountMinor)}`} /><Row label="Delivery" value={money(quote.data.delivery.amountMinor)} /><View style={styles.divider} /><Row label="Total" strong value={money(quote.data.total.amountMinor)} /><View style={styles.secure}><Ionicons color={colors.success} name="shield-checkmark-outline" size={21} /><Text style={styles.secureText}>Protected guest checkout with authoritative prices and inventory.</Text></View><Pressable disabled={submitDisabled} onPress={() => void submit()} style={[styles.primary, submitDisabled && styles.disabled]}>{busy ? <ActivityIndicator color={colors.surface} /> : <><Ionicons color={colors.surface} name="lock-closed" size={18} /><Text style={styles.primaryText}>Place guest order</Text></>}</Pressable></View></View>
  </Screen>;
}

function Section({ children, title }: { children: React.ReactNode; title: string }) { return <View style={[styles.section, premiumStyles.section]}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>; }
function Field({ full, label, ...props }: { full?: boolean; label: string } & React.ComponentProps<typeof TextInput>) { const { width } = useWindowDimensions(); return <View style={[styles.field, full && styles.full, width < 600 && { flexBasis: "100%", minWidth: 0 }]}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} /></View>; }
function Row({ label, strong, value }: { label: string; strong?: boolean; value: string }) { return <View style={styles.row}><Text style={[styles.muted, strong && styles.strong]}>{label}</Text><Text style={[styles.value, strong && styles.strong]}>{value}</Text></View>; }

const styles = StyleSheet.create({ columns: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.lg }, main: { flex: 2, gap: spacing.lg, minWidth: 300 }, section: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, padding: spacing.lg }, sectionTitle: { color: colors.text, fontSize: 19, fontWeight: "700" }, grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, field: { flex: 1, gap: 6, minWidth: 210 }, full: { flexBasis: "100%" }, label: { color: colors.text, fontSize: 12, fontWeight: "600" }, input: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 46, paddingHorizontal: spacing.md }, option: { alignItems: "center", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md }, selected: { backgroundColor: colors.primarySoft, borderColor: colors.primary }, optionText: { color: colors.text, fontWeight: "600" }, summary: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flex: 1, gap: spacing.md, minWidth: 290, padding: spacing.lg }, summaryTitle: { color: colors.text, fontSize: 20, fontWeight: "700" }, row: { flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }, muted: { color: colors.muted }, value: { color: colors.text, fontWeight: "600" }, strong: { color: colors.text, fontSize: 17, fontWeight: "700" }, divider: { borderTopColor: colors.border, borderTopWidth: 1 }, secure: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.sm }, secureText: { color: colors.success, flex: 1, fontSize: 11 }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.lg }, primaryText: { color: colors.surface, fontWeight: "700" }, disabled: { opacity: 0.55 }, link: { color: colors.primary, fontWeight: "600" }, error: { backgroundColor: colors.primarySoft, borderRadius: radius.md, color: colors.danger, marginBottom: spacing.md, padding: spacing.md }, center: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.lg, padding: 48 } });

const premiumStyles = StyleSheet.create({
  option: { minHeight: 56 },
  section: { borderRadius: radius.xl, borderWidth: 0, boxShadow: "0 10px 30px rgba(11,31,58,.08)" },
  summary: { borderRadius: radius.xl, borderWidth: 0, boxShadow: "0 12px 34px rgba(11,31,58,.10)" }
});
