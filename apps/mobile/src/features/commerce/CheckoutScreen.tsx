import type { PaymentMethod } from "@amiyo/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { formatMinor, isPositiveMinor, subtractMinor } from "../../ui/money";
import { getMyAddresses } from "../auth/auth.api";
import { useCurrentUser } from "../auth/use-current-user";
import { createCheckoutAttempt } from "./checkout-attempt";
import { getCheckoutQuote, getPendingCheckout, placeOrder } from "./commerce.api";
import { CheckoutRecovery } from "./CheckoutRecovery";
import { CouponInput } from "./components/CouponInput";
import { getPublicPlatformSettings } from "../platform/platform.api";
import { checkoutPolicyError, paymentMethodEnabled } from "./checkout-policy";

const money = (minor: string) => formatMinor(minor);
const formatBps = (basisPoints: number) => `${(basisPoints / 100).toLocaleString("en-BD", { maximumFractionDigits: 2 })}%`;
const methods: Array<{ value: PaymentMethod; label: string; detail: string; icon: string }> = [
  { value: "COD", label: "Cash on delivery", detail: "Pay when your order arrives", icon: "cash-outline" },
  { value: "SSLCOMMERZ", label: "Card / mobile banking", detail: "Powered by SSLCommerz", icon: "card-outline" }
];

export function CheckoutScreen() {
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
  const [addressId, setAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [couponCode, setCouponCode] = useState<string | null>(params.couponCode?.toUpperCase() || null);
  const [loyaltyPoints, setLoyaltyPoints] = useState("0");
  const [busy, setBusy] = useState(false);
  const [codPhoneConfirmed, setCodPhoneConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addresses = useQuery({ queryKey: ["me", "addresses", user?.uid], queryFn: () => getMyAddresses(user!), enabled: Boolean(user) });
  const quote = useQuery({ queryKey: ["checkout", user?.uid, "quote", couponCode, loyaltyPoints, addressId], queryFn: () => getCheckoutQuote(user!, couponCode, loyaltyPoints, addressId), enabled: Boolean(user) });
  const platform = useQuery({ queryKey: ["platform", "public-settings"], queryFn: getPublicPlatformSettings, staleTime: 5 * 60_000 });
  const village = platform.data?.villageOperations;
  const availableMethods = methods.filter((method) => paymentMethodEnabled(platform.data, method.value));
  const selectedAddress = addresses.data?.find((address) => address.id === addressId);
  const policyError = checkoutPolicyError(platform.error ? undefined : platform.data, paymentMethod, codPhoneConfirmed, selectedAddress);
  const submitDisabled = busy || !selectedAddress || Boolean(policyError);

  useEffect(() => { setAddressId(null); setPaymentMethod("COD"); setCouponCode(params.couponCode?.toUpperCase() || null); setLoyaltyPoints("0"); setCodPhoneConfirmed(false); setError(null); submitLock.current = false; }, [user?.uid]);
  useEffect(() => { if (!addressId && addresses.data?.length) setAddressId((addresses.data.find((item) => item.isDefault) || addresses.data[0]!).id); }, [addressId, addresses.data]);
  useEffect(() => { setCodPhoneConfirmed(false); }, [addressId, user?.uid]);
  async function applyCoupon(code: string) { if (!user) return; const ownerUid = user.uid; const next = await getCheckoutQuote(user, code, loyaltyPoints, addressId); if (activeUid.current !== ownerUid) return; queryClient.setQueryData(["checkout", ownerUid, "quote", code, loyaltyPoints, addressId], next); setCouponCode(code); }
  async function toggleRewards() {
    const loyalty = quote.data?.loyalty;
    if (!loyalty) return;
    const eligible = loyalty.policy.enabled && BigInt(loyalty.availablePoints) >= BigInt(loyalty.policy.minimumRedemptionPoints);
    setLoyaltyPoints(BigInt(loyalty.redeemedPoints) > 0n || !eligible ? "0" : loyalty.availablePoints);
  }
  async function submit() {
    if (!user || !addressId || submitLock.current) return;
    if (policyError || !selectedAddress) { setError(policyError || "Select your delivery address."); return; }
    submitLock.current = true;
    setBusy(true); setError(null);
    const ownerUid = user.uid;
    try {
      const input = { addressId, paymentMethod, couponCode, loyaltyPoints, codPhoneConfirmed };
      const result = await attempt.current(JSON.stringify([user.uid, input]), (key) => placeOrder(user, input, key));
      if (activeUid.current !== ownerUid) return;
      queryClient.removeQueries({ queryKey: ["cart", ownerUid] });
      queryClient.removeQueries({ queryKey: ["checkout", ownerUid] });
      router.replace({ pathname: "/order-confirmation", params: { orderId: result.order.id, orderNumber: result.order.orderNumber, totalMinor: result.order.total.amountMinor, payment: result.payment.status, invoice: result.invoiceNumber, actionUrl: result.actionUrl || "", instructions: result.instructions || "" } });
    }
    catch (caught) { if (activeUid.current === ownerUid) setError(caught instanceof Error ? caught.message : "Checkout could not be completed"); }
    finally { submitLock.current = false; if (activeUid.current === ownerUid) setBusy(false); }
  }

  if (!user) return <Centered title="Sign in to checkout" copy="Checkout is currently available to authenticated customers." action="Sign in" onPress={() => router.replace("/auth")} />;
  if (recovery.isPending) return <Centered loading title="Checking previous checkout" copy="Looking for an unfinished order request." />;
  if (recovery.error) return <Centered title="Checkout recovery unavailable" copy={recovery.error.message} action="View my orders" onPress={() => router.replace("/orders")} />;
  if (recovery.data) return <CheckoutRecovery user={user} pending={recovery.data} />;
  if (addresses.isLoading || quote.isLoading) return <Centered loading title="Preparing checkout" copy="Confirming inventory and current prices." />;
  const loadError = addresses.error || quote.error;
  if (loadError || !quote.data) return <Centered title="Checkout unavailable" copy={loadError instanceof Error ? loadError.message : "Please return to your cart."} action="Back to cart" onPress={() => router.replace("/cart")} />;
  return <Screen eyebrow="SECURE CHECKOUT" title="Delivery and payment" description="Confirm your delivery address and preferred payment method.">
    {error || policyError ? <Text accessibilityRole="alert" style={styles.error}>{error || policyError}</Text> : null}
    {platform.error ? <Pressable accessibilityRole="button" onPress={() => void platform.refetch()} style={styles.primary}><Text style={styles.primaryText}>Retry marketplace settings</Text></Pressable> : null}
    <View style={styles.steps}><Step complete icon="cart-outline" label="Cart" /><View style={styles.stepLineActive} /><Step active icon="location-outline" label="Delivery" /><View style={styles.stepLine} /><Step icon="card-outline" label="Payment" /></View>
    <View style={styles.columns}><View style={[styles.main, compact && { flex: 0, width: "100%", minWidth: 0 }]}>
      <Section index="1" title="Delivery address">{addresses.data?.length ? addresses.data.map((address) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: addressId === address.id }} key={address.id} onPress={() => setAddressId(address.id)} style={[styles.option, premiumStyles.option, addressId === address.id && styles.selected]}><Ionicons name={addressId === address.id ? "radio-button-on" : "radio-button-off"} size={22} color={colors.primary} /><View style={styles.optionCopy}><Text style={styles.optionTitle}>{address.label} · {address.recipientName}</Text><Text style={styles.muted}>{[address.line1, address.line2, address.unionName, address.upazila, address.district, address.division].filter(Boolean).join(", ")}</Text><Text style={styles.muted}>{address.phone}</Text></View>{address.isDefault ? <Text style={styles.defaultBadge}>DEFAULT</Text> : null}</Pressable>) : <View style={styles.empty}><Text style={styles.muted}>Add a delivery address before checkout.</Text><Pressable onPress={() => router.push("/addresses")}><Text style={styles.link}>Add address</Text></Pressable></View>}</Section>
      <Section index="2" title="Payment method">{availableMethods.map((method) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: paymentMethod === method.value }} key={method.value} onPress={() => { setPaymentMethod(method.value); if (method.value !== "COD") setCodPhoneConfirmed(false); }} style={[styles.option, premiumStyles.option, paymentMethod === method.value && styles.selected]}><View style={styles.paymentIcon}><Ionicons color={colors.primary} name={method.icon as never} size={21} /></View><View style={styles.optionCopy}><Text style={styles.optionTitle}>{method.label}</Text><Text style={styles.muted}>{method.detail}</Text></View><Ionicons name={paymentMethod === method.value ? "radio-button-on" : "radio-button-off"} size={22} color={colors.primary} /></Pressable>)}{paymentMethod === "COD" && village?.enabled && village.requireCodPhoneConfirmation ? <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: codPhoneConfirmed }} onPress={() => setCodPhoneConfirmed((value) => !value)} style={[styles.option, premiumStyles.option, codPhoneConfirmed && styles.selected]}><Ionicons color={colors.primary} name={codPhoneConfirmed ? "checkbox" : "square-outline"} size={22} /><View style={styles.optionCopy}><Text style={styles.optionTitle}>My delivery phone is active</Text><Text style={styles.muted}>The delivery team may call before dispatch. Confirm this to place a COD order.</Text></View></Pressable> : null}</Section>
    </View><View style={[styles.summary, premiumStyles.summary, compact && { flex: 0, width: "100%", minWidth: 0 }]}><Text style={styles.summaryTitle}>Payment summary</Text><CouponInput appliedQuote={quote.data} busy={quote.isFetching} onApply={applyCoupon} onRemove={() => setCouponCode(null)} /><View style={styles.rewardCard}><View style={styles.rewardCopy}><Text style={styles.rewardTitle}>Amiyo rewards</Text><Text style={styles.muted}>{quote.data.loyalty.policy.enabled ? `${BigInt(quote.data.loyalty.availablePoints).toLocaleString("en-BD")} points available${BigInt(quote.data.loyalty.redeemedPoints) > 0n ? ` · ${quote.data.loyalty.redeemedPoints} applied` : ` · minimum ${BigInt(quote.data.loyalty.policy.minimumRedemptionPoints).toLocaleString("en-BD")}`}` : "Rewards redemption is currently paused."}</Text>{quote.data.loyalty.policy.enabled ? <Text style={styles.rewardPolicy}>Apply rewards to up to {formatBps(quote.data.loyalty.policy.maximumRedemptionBps)} of the payable total.</Text> : null}</View><Pressable disabled={quote.isFetching || !quote.data.loyalty.policy.enabled || BigInt(quote.data.loyalty.availablePoints) < BigInt(quote.data.loyalty.policy.minimumRedemptionPoints)} onPress={() => void toggleRewards()} style={[styles.rewardButton, (quote.isFetching || !quote.data.loyalty.policy.enabled || BigInt(quote.data.loyalty.availablePoints) < BigInt(quote.data.loyalty.policy.minimumRedemptionPoints)) && styles.disabled]}><Text style={styles.rewardButtonText}>{BigInt(quote.data.loyalty.redeemedPoints) > 0n ? "Remove" : "Use points"}</Text></Pressable></View><Row label="Subtotal" value={money(quote.data.subtotal.amountMinor)} /><Row label={quote.data.coupon ? `${quote.data.coupon.sourceType === "voucher" ? "Voucher" : "Coupon"} (${quote.data.coupon.code})` : "Promotion discount"} value={`-${money(String(subtractMinor(quote.data.discount.amountMinor, quote.data.loyalty.discount.amountMinor)))}`} />{isPositiveMinor(quote.data.loyalty.discount.amountMinor) ? <Row label={`Rewards (${quote.data.loyalty.redeemedPoints} points)`} value={`-${money(quote.data.loyalty.discount.amountMinor)}`} /> : null}<Row label="Delivery" value={money(quote.data.delivery.amountMinor)} /><Row label="Tax" value={money(quote.data.tax.amountMinor)} /><View style={styles.divider} /><Row label="Total" value={money(quote.data.total.amountMinor)} strong /><Text style={styles.muted}>{quote.data.vendorCount} seller order{quote.data.vendorCount === 1 ? "" : "s"} will be created.</Text><View style={styles.secure}><Ionicons color={colors.success} name="shield-checkmark-outline" size={20} /><Text style={styles.secureText}>Your checkout is encrypted and protected.</Text></View><Pressable disabled={submitDisabled} onPress={submit} style={[styles.primary, submitDisabled && styles.disabled]}>{busy ? <ActivityIndicator color={colors.surface} /> : <><Ionicons name="lock-closed" size={18} color={colors.surface} /><Text style={styles.primaryText}>Place order</Text></>}</Pressable></View></View>
  </Screen>;
}

function Step({ active, complete, icon, label }: { active?: boolean; complete?: boolean; icon: string; label: string }) { const highlighted = active || complete; return <View style={styles.step}><View style={[styles.stepIcon, highlighted && styles.stepIconActive]}><Ionicons color={highlighted ? colors.surface : colors.muted} name={(complete ? "checkmark" : icon) as never} size={17} /></View><Text style={[styles.stepLabel, highlighted && styles.stepLabelActive]}>{label}</Text></View>; }
function Section({ children, index, title }: { children: React.ReactNode; index: string; title: string }) { return <View style={[styles.section, premiumStyles.section]}><View style={styles.sectionHeading}><View style={styles.sectionIndex}><Text style={styles.sectionIndexText}>{index}</Text></View><Text style={styles.sectionTitle}>{title}</Text></View>{children}</View>; }
function Row({ label, strong, value }: { label: string; strong?: boolean; value: string }) { return <View style={styles.row}><Text style={[styles.muted, strong && styles.strong]}>{label}</Text><Text style={[styles.rowValue, strong && styles.strong]}>{value}</Text></View>; }
function Centered({ action, copy, loading, onPress, title }: { action?: string; copy: string; loading?: boolean; onPress?: () => void; title: string }) { return <Screen eyebrow="CHECKOUT" title={title} description={copy}><View style={[styles.centerCard, premiumStyles.centerCard]}>{loading ? <ActivityIndicator color={colors.primary} size="large" /> : <Ionicons name="shield-checkmark-outline" size={50} color={colors.primary} />}{action && onPress ? <Pressable onPress={onPress} style={styles.primary}><Text style={styles.primaryText}>{action}</Text></Pressable> : null}</View></Screen>; }

const styles = StyleSheet.create({ steps: { alignItems: "center", alignSelf: "center", flexDirection: "row", marginBottom: spacing.sm, maxWidth: 480, width: "100%" }, step: { alignItems: "center", gap: 5 }, stepIcon: { alignItems: "center", backgroundColor: colors.border, borderRadius: radius.pill, height: 34, justifyContent: "center", width: 34 }, stepIconActive: { backgroundColor: colors.primary }, stepLabel: { color: colors.muted, fontSize: 10, fontWeight: "600" }, stepLabelActive: { color: colors.primary }, stepLine: { backgroundColor: colors.border, flex: 1, height: 2, marginBottom: 17 }, stepLineActive: { backgroundColor: colors.primary, flex: 1, height: 2, marginBottom: 17 }, columns: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.lg }, main: { flex: 2, gap: spacing.lg, minWidth: 300 }, section: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm, padding: spacing.lg }, sectionHeading: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: 10, marginBottom: spacing.sm, paddingBottom: spacing.md }, sectionIndex: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.pill, height: 28, justifyContent: "center", width: 28 }, sectionIndexText: { color: colors.surface, fontSize: 12, fontWeight: "700" }, sectionTitle: { color: colors.text, fontSize: 19, fontWeight: "700" }, option: { alignItems: "center", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, padding: spacing.md }, selected: { backgroundColor: colors.primarySoft, borderColor: colors.primary }, optionCopy: { flex: 1, gap: 3 }, optionTitle: { color: colors.text, fontWeight: "700" }, defaultBadge: { backgroundColor: colors.accentSoft, borderRadius: 4, color: colors.success, fontSize: 8, fontWeight: "700", paddingHorizontal: 6, paddingVertical: 4 }, paymentIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 40, justifyContent: "center", width: 40 }, empty: { alignItems: "center", gap: spacing.sm, padding: spacing.lg }, summary: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flex: 1, gap: spacing.md, minWidth: 290, padding: spacing.lg }, summaryTitle: { color: colors.text, fontSize: 20, fontWeight: "700" }, rewardCard: { alignItems: "center", backgroundColor: colors.accentSoft, borderColor: colors.accent, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, padding: spacing.sm }, rewardCopy: { flex: 1 }, rewardTitle: { color: colors.text, fontWeight: "700" }, rewardPolicy: { color: colors.muted, fontSize: 10, marginTop: 2 }, rewardButton: { backgroundColor: colors.navy, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 }, rewardButtonText: { color: colors.surface, fontSize: 10, fontWeight: "700" }, row: { flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }, rowValue: { color: colors.text, fontWeight: "600" }, strong: { color: colors.text, fontSize: 17, fontWeight: "700" }, divider: { borderTopColor: colors.border, borderTopWidth: 1 }, muted: { color: colors.muted, lineHeight: 19 }, secure: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.sm }, secureText: { color: colors.success, flex: 1, fontSize: 11 }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.lg }, primaryText: { color: colors.surface, fontWeight: "700" }, disabled: { opacity: 0.5 }, link: { color: colors.primary, fontWeight: "700" }, error: { backgroundColor: colors.primarySoft, borderRadius: radius.md, color: colors.danger, padding: spacing.md }, centerCard: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderStyle: "dashed", borderWidth: 1, gap: spacing.lg, padding: 44 }, successPanel: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, gap: spacing.lg, padding: spacing.xl }, successIcon: { alignItems: "center", backgroundColor: colors.success, borderRadius: radius.pill, height: 68, justifyContent: "center", width: 68 }, receipt: { gap: spacing.md, maxWidth: 440, width: "100%" }, notice: { backgroundColor: colors.primarySoft, borderRadius: radius.md, color: colors.primaryDark, maxWidth: 440, padding: spacing.md, width: "100%" } });

const premiumStyles = StyleSheet.create({
  centerCard: { borderWidth: 0, boxShadow: "0 10px 30px rgba(11,31,58,.08)" },
  option: { minHeight: 56 },
  section: { borderRadius: radius.xl, borderWidth: 0, boxShadow: "0 10px 30px rgba(11,31,58,.08)" },
  summary: { borderRadius: radius.xl, borderWidth: 0, boxShadow: "0 12px 34px rgba(11,31,58,.10)" }
});
