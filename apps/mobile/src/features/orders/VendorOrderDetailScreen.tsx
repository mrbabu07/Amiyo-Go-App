import type { VendorDeliveryExceptionInput, VendorOrderDetail, VendorOrderStatus, VendorPickupRequestInput } from "@amiyo/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { OrderItemImage } from "./OrderItemImage";
import { getVendorOrder, openVendorOrderCustomerThread, reportVendorDeliveryException, requestVendorOrderPickup, transitionVendorOrder } from "./orders.api";

const actions: Partial<Record<VendorOrderStatus, Array<{ status: VendorOrderStatus; label: string; danger?: boolean }>>> = {
  PLACED: [{ status: "ACCEPTED", label: "Accept order" }, { status: "REJECTED", label: "Reject", danger: true }],
  ACCEPTED: [{ status: "PROCESSING", label: "Start processing" }],
  PROCESSING: [{ status: "READY_TO_SHIP", label: "Ready for pickup" }]
};
const money = (minor: string, currency = "BDT") => `${currency === "BDT" ? "Tk" : currency} ${(Number(minor) / 100).toLocaleString("en-BD", { minimumFractionDigits: 2 })}`;
const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const exceptionCategories: VendorDeliveryExceptionInput["category"][] = ["PICKUP_DELAY", "CARRIER_NO_SHOW", "ADDRESS_ISSUE", "CUSTOMER_UNAVAILABLE", "PARCEL_DAMAGED", "OTHER"];
const exceptionResolutions: VendorDeliveryExceptionInput["requestedResolution"][] = ["REATTEMPT", "CONTACT_CUSTOMER", "RETURN_TO_SELLER", "INVESTIGATE"];
const pickupWindows: VendorPickupRequestInput["pickupWindow"][] = ["09:00-12:00", "12:00-16:00", "16:00-19:00"];

export function VendorOrderDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;
  const { width } = useWindowDimensions();
  const compact = width < 640;
  const [busy, setBusy] = useState<VendorOrderStatus | null>(null);
  const [openingChat, setOpeningChat] = useState(false);
  const [exceptionOpen, setExceptionOpen] = useState(false);
  const [exceptionBusy, setExceptionBusy] = useState(false);
  const [exceptionCategory, setExceptionCategory] = useState<VendorDeliveryExceptionInput["category"]>("PICKUP_DELAY");
  const [exceptionResolution, setExceptionResolution] = useState<VendorDeliveryExceptionInput["requestedResolution"]>("INVESTIGATE");
  const [exceptionReason, setExceptionReason] = useState("");
  const [exceptionNotes, setExceptionNotes] = useState("");
  const [exceptionKey, setExceptionKey] = useState<string | null>(null);
  const [exceptionSuccess, setExceptionSuccess] = useState<string | null>(null);
  const [pickupDay, setPickupDay] = useState(1);
  const [pickupWindow, setPickupWindow] = useState<VendorPickupRequestInput["pickupWindow"]>("09:00-12:00");
  const [pickupNote, setPickupNote] = useState("");
  const [pickupKey, setPickupKey] = useState<string | null>(null);
  const [pickupBusy, setPickupBusy] = useState(false);
  const [pickupSuccess, setPickupSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const order = useQuery({ queryKey: ["orders", "vendor", id, user?.uid], queryFn: () => getVendorOrder(user!, id), enabled: Boolean(user) });

  async function transition(status: VendorOrderStatus) {
    if (!user || !order.data) return;
    setBusy(status);
    setError(null);
    try {
      const updated = await transitionVendorOrder(user, id, { status, expectedVersion: order.data.version }, Crypto.randomUUID());
      if (activeUid.current !== user.uid) return;
      queryClient.setQueryData(["orders", "vendor", id, user.uid], updated);
      await queryClient.invalidateQueries({ queryKey: ["orders", "vendor", user.uid] });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Order update failed");
    } finally {
      setBusy(null);
    }
  }

  async function messageCustomer() {
    if (!user || openingChat) return;
    setOpeningChat(true);
    setError(null);
    try {
      const thread = await openVendorOrderCustomerThread(user, id);
      router.push(`/vendor/messages/${thread.id}` as never);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Customer conversation could not be opened");
    } finally {
      setOpeningChat(false);
    }
  }

  async function reportException() {
    if (!user || exceptionBusy || exceptionReason.trim().length < 5) return;
    const key = exceptionKey ?? Crypto.randomUUID();
    setExceptionKey(key);
    setExceptionBusy(true);
    setExceptionSuccess(null);
    setError(null);
    try {
      await reportVendorDeliveryException(user, id, { category: exceptionCategory, requestedResolution: exceptionResolution, reason: exceptionReason.trim(), notes: exceptionNotes.trim() || null, retryAt: null }, key);
      setExceptionSuccess("Delivery exception sent to operations and the customer was notified.");
      setExceptionOpen(false);
      setExceptionReason("");
      setExceptionNotes("");
      setExceptionKey(null);
      await order.refetch();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Delivery exception could not be reported");
    } finally {
      setExceptionBusy(false);
    }
  }

  async function requestPickup() {
    if (!user || pickupBusy) return;
    const key = pickupKey ?? Crypto.randomUUID();
    setPickupKey(key);
    setPickupBusy(true);
    setPickupSuccess(null);
    setError(null);
    try {
      await requestVendorOrderPickup(user, id, { pickupDate: pickupDateFor(pickupDay), pickupWindow, note: pickupNote.trim() || null }, key);
      setPickupSuccess("Pickup preference sent. Operations will assign and confirm the courier.");
      setPickupKey(null);
      await order.refetch();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Pickup request could not be sent");
    } finally {
      setPickupBusy(false);
    }
  }

  if (order.isLoading) return <Screen eyebrow="FULFILLMENT" title="Loading seller order"><View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View></Screen>;
  if (!order.data) return <Screen eyebrow="FULFILLMENT" title="Order unavailable" description="This package could not be opened in your seller workspace."><View style={styles.center}><Text style={styles.error}>{order.error instanceof Error ? order.error.message : "Order not found"}</Text><Pressable onPress={() => router.back()}><Text style={styles.link}>Go back</Text></Pressable></View></Screen>;

  const item = order.data;
  const units = item.items.reduce((sum, line) => sum + line.quantity, 0);
  return <Screen hideHeading title="Vendor order detail"><View style={styles.page}>
    <Pressable onPress={() => router.back()} style={styles.back}><Ionicons color={colors.primary} name="arrow-back" size={17} /><Text style={styles.link}>Vendor orders</Text></Pressable>
    <View style={[styles.hero, compact && styles.heroCompact]}>
      <View style={styles.flex}><View style={styles.statusRow}><Text style={styles.status}>{label(item.status)}</Text><Text style={styles.version}>v{item.version}</Text></View><Text accessibilityRole="header" style={styles.title}>{item.orderNumber}</Text><Text style={styles.heroText}>{item.shopName} package with {units} unit{units === 1 ? "" : "s"} ready for seller fulfillment.</Text></View>
      <View style={[styles.heroActions, compact && styles.heroActionsCompact]}><HeroButton icon="chatbubble-ellipses-outline" label={openingChat ? "Opening chat..." : "Message customer"} disabled={openingChat} onPress={messageCustomer} /><HeroButton icon="document-text-outline" label="Shipping documents" onPress={() => router.push(`/vendor/order/${item.id}/documents` as never)} primary /><HeroButton icon="refresh" label="Refresh" onPress={() => order.refetch()} /></View>
    </View>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <View style={styles.metrics}><Metric icon="cube-outline" label="Units" value={String(units)} /><Metric icon="cash-outline" label="Package total" value={money(item.total.amountMinor, item.total.currency)} /><Metric icon="card-outline" label="Payment" value={item.payment ? `${item.payment.method} - ${item.payment.status}` : "Pending"} /></View>
    <View style={styles.columns}>
      <View style={[styles.column, compact && styles.full]}><Panel title="Customer & delivery" meta="Use this for delivery handoff only."><Detail label="Customer" value={item.customer.displayName} /><Detail label="Phone" value={item.deliveryAddress?.phone ?? item.customer.phone ?? "-"} /><Detail label="Address" value={item.deliveryAddress ? address(item.deliveryAddress) : "Delivery address unavailable"} /><Detail label="Parcel inspection" value={item.deliveryInspection.openBoxAllowed ? `Open-box · ${item.deliveryInspection.inspectionMinutes} minute window` : "Closed-box · direct customers to returns for eligible issues"} /></Panel></View>
      <View style={[styles.column, compact && styles.full]}><Panel title="Payment collection" meta={item.payment?.transactionId ?? "No transaction reference yet"}><Detail label="Method" value={item.payment?.method ?? "-"} /><Detail label="Status" value={item.payment?.status ?? "-"} /><Detail label="Collect on delivery" value={item.payment?.method === "COD" ? money(item.total.amountMinor, item.total.currency) : "Prepaid / no COD collection"} strong /></Panel></View>
    </View>
    <Panel title="Products to fulfill" meta={`${item.items.length} product line${item.items.length === 1 ? "" : "s"} from this store.`}>
      <View style={styles.tableHead}><Text style={[styles.head, styles.product]}>Product</Text><Text style={styles.head}>Qty</Text><Text style={styles.head}>Unit</Text><Text style={[styles.head, styles.right]}>Total</Text></View>
      {item.items.map((line) => <View key={line.id} style={[styles.line, compact && styles.lineCompact]}><View style={[styles.product, styles.productIdentity]}><OrderItemImage name={line.productName} uri={line.thumbnailUrl} /><View style={styles.productCopy}><Text style={styles.itemName}>{line.productName}</Text><Text style={styles.muted}>{line.sku}{line.attributes ? ` - ${Object.values(line.attributes).filter(Boolean).join(", ")}` : ""}</Text></View></View><Text style={styles.cell}>{line.quantity}</Text><Text style={styles.cell}>{money(line.unitPrice.amountMinor, line.unitPrice.currency)}</Text><Text style={[styles.cell, styles.right]}>{money(line.lineTotal.amountMinor, line.lineTotal.currency)}</Text></View>)}
    </Panel>
    <View style={styles.columns}>
      <View style={[styles.column, compact && styles.full]}><Panel title="Package totals"><Detail label="Subtotal" value={money(item.subtotal.amountMinor, item.subtotal.currency)} /><Detail label="Discount" value={`- ${money(item.discount.amountMinor, item.discount.currency)}`} /><Detail label="Delivery" value={money(item.delivery.amountMinor, item.delivery.currency)} /><Detail label="Seller package total" value={money(item.total.amountMinor, item.total.currency)} strong /></Panel></View>
      <View style={[styles.column, compact && styles.full]}><Panel title="Shipment status" meta={item.dispatchStatus ?? "Dispatch not requested"}><Detail label="Provider" value={item.shipment?.provider ?? "Amiyo delivery"} /><Detail label="Tracking" value={item.shipment?.trackingNumber ?? "At pickup"} /><Detail label="Shipment" value={item.shipment?.status ? label(item.shipment.status) : "Not created"} /></Panel></View>
    </View>
    <Panel title="Fulfillment timeline" meta="Recorded package and courier events only.">
      <TimelineEvent status="PACKAGE_CREATED" description="Seller package created" occurredAt={item.createdAt} first last={!item.shipment?.events.length} />
      {item.shipment?.events.map((event, index) => <TimelineEvent key={event.id} status={event.status} description={event.description || "No event note recorded"} location={event.location} occurredAt={event.occurredAt} last={index === item.shipment!.events.length - 1} />)}
      {!item.shipment?.events.length ? <Text style={styles.timelineEmpty}>No courier event has been recorded yet.</Text> : null}
    </Panel>
    {item.shipment?.status === "READY_TO_SHIP" ? <Panel title="Request courier pickup" meta="Choose a preferred slot. Operations assigns the courier and confirms pickup.">
      {item.shipment.pickupRequest ? <View style={styles.pickupCurrent}><Ionicons color={colors.success} name="calendar-outline" size={18} /><View style={styles.flex}><Text style={styles.itemName}>Current request: {new Date(item.shipment.pickupRequest.pickupDate).toLocaleDateString("en-BD")} · {item.shipment.pickupRequest.pickupWindow}</Text>{item.shipment.pickupRequest.note ? <Text style={styles.muted}>{item.shipment.pickupRequest.note}</Text> : null}</View></View> : null}
      {pickupSuccess ? <Text style={styles.success}>{pickupSuccess}</Text> : null}
      <Text style={styles.detailLabel}>Preferred day</Text><View style={styles.choiceRow}>{[1, 2, 3].map((day) => <Choice key={day} active={pickupDay === day} disabled={pickupBusy} label={pickupDayLabel(day)} onPress={() => { setPickupDay(day); setPickupKey(null); }} />)}</View>
      <Text style={styles.detailLabel}>Pickup window</Text><View style={styles.choiceRow}>{pickupWindows.map((window) => <Choice key={window} active={pickupWindow === window} disabled={pickupBusy} label={window} onPress={() => { setPickupWindow(window); setPickupKey(null); }} />)}</View>
      <Text style={styles.detailLabel}>Pickup note (optional)</Text><TextInput accessibilityLabel="Pickup note" editable={!pickupBusy} maxLength={500} onChangeText={(value) => { setPickupNote(value); setPickupKey(null); }} placeholder="Gate, landmark, package count, or contact timing" placeholderTextColor={colors.muted} style={styles.input} value={pickupNote} />
      <Pressable accessibilityRole="button" disabled={pickupBusy} onPress={requestPickup} style={[styles.primary, pickupBusy && styles.disabled]}>{pickupBusy ? <ActivityIndicator color="#fff" /> : <><Ionicons color="#fff" name="calendar-outline" size={18} /><Text style={styles.primaryText}>{item.shipment.pickupRequest ? "Update pickup request" : "Send pickup request"}</Text></>}</Pressable>
    </Panel> : null}
    {item.shipment && ["READY_TO_SHIP", "PICKED_UP", "IN_TRANSIT"].includes(item.shipment.status) ? <Panel title="Delivery exception" meta="Report a pickup or transit problem without changing courier status.">
      {exceptionSuccess ? <Text style={styles.success}>{exceptionSuccess}</Text> : null}
      {!exceptionOpen ? <Pressable accessibilityRole="button" onPress={() => setExceptionOpen(true)} style={styles.exceptionTrigger}><Ionicons color={colors.danger} name="warning-outline" size={18} /><Text style={styles.exceptionTriggerText}>Report delivery issue</Text></Pressable> : <View style={styles.exceptionForm}>
        <Text style={styles.detailLabel}>Issue category</Text><View style={styles.choiceRow}>{exceptionCategories.map((value) => <Choice key={value} active={exceptionCategory === value} disabled={exceptionBusy} label={label(value)} onPress={() => { setExceptionCategory(value); setExceptionKey(null); }} />)}</View>
        <Text style={styles.detailLabel}>Requested operations action</Text><View style={styles.choiceRow}>{exceptionResolutions.map((value) => <Choice key={value} active={exceptionResolution === value} disabled={exceptionBusy} label={label(value)} onPress={() => { setExceptionResolution(value); setExceptionKey(null); }} />)}</View>
        <Text style={styles.detailLabel}>Reason</Text><TextInput accessibilityLabel="Delivery exception reason" editable={!exceptionBusy} maxLength={500} onChangeText={(value) => { setExceptionReason(value); setExceptionKey(null); }} placeholder="Describe what is blocking pickup or delivery" placeholderTextColor={colors.muted} style={styles.input} value={exceptionReason} />
        <Text style={styles.detailLabel}>Additional notes (optional)</Text><TextInput accessibilityLabel="Delivery exception notes" editable={!exceptionBusy} maxLength={1000} multiline onChangeText={(value) => { setExceptionNotes(value); setExceptionKey(null); }} placeholder="Add courier contact, timing, or handling details" placeholderTextColor={colors.muted} style={[styles.input, styles.notes]} value={exceptionNotes} />
        <View style={styles.actions}><Pressable accessibilityRole="button" disabled={exceptionBusy || exceptionReason.trim().length < 5} onPress={reportException} style={[styles.primary, (exceptionBusy || exceptionReason.trim().length < 5) && styles.disabled]}>{exceptionBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Send to operations</Text>}</Pressable><Pressable accessibilityRole="button" disabled={exceptionBusy} onPress={() => setExceptionOpen(false)} style={styles.heroButton}><Text style={styles.heroButtonText}>Cancel</Text></Pressable></View>
      </View>}
    </Panel> : null}
    {actions[item.status]?.length ? <View style={styles.actions}>{actions[item.status]!.map((action) => <Pressable disabled={Boolean(busy)} key={action.status} onPress={() => transition(action.status)} style={[styles.primary, action.danger && styles.danger, busy && styles.disabled]}>{busy === action.status ? <ActivityIndicator color="#fff" /> : <><Ionicons name={action.status === "READY_TO_SHIP" ? "cube-outline" : "checkmark-circle-outline"} size={19} color="#fff" /><Text style={styles.primaryText}>{action.label}</Text></>}</Pressable>)}</View> : <Text style={styles.notice}>No seller action is required at this stage.</Text>}
  </View></Screen>;
}

function HeroButton({ disabled, icon, label: text, onPress, primary }: { disabled?: boolean; icon: string; label: string; onPress(): void; primary?: boolean }) { return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.heroButton, primary && styles.heroButtonPrimary, disabled && styles.disabled]}><Ionicons color={primary ? "#fff" : colors.primary} name={icon as never} size={17} /><Text style={[styles.heroButtonText, primary && styles.light]}>{text}</Text></Pressable>; }
function Panel({ children, meta, title }: { children: ReactNode; meta?: string; title: string }) { return <View style={styles.card}><View><Text style={styles.sectionTitle}>{title}</Text>{meta ? <Text style={styles.muted}>{meta}</Text> : null}</View>{children}</View>; }
function Detail({ label: title, strong, value }: { label: string; strong?: boolean; value: string }) { return <View style={styles.detail}><Text style={styles.detailLabel}>{title}</Text><Text selectable style={[styles.value, strong && styles.strong]}>{value}</Text></View>; }
function Metric({ icon, label: title, value }: { icon: string; label: string; value: string }) { return <View style={styles.metric}><View style={styles.metricIcon}><Ionicons color={colors.primary} name={icon as never} size={19} /></View><View style={styles.flex}><Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{value}</Text><Text style={styles.muted}>{title}</Text></View></View>; }
function TimelineEvent({ description, first, last, location, occurredAt, status }: { description: string; first?: boolean; last: boolean; location?: string | null; occurredAt: string; status: string }) { return <View style={styles.timelineRow}><View style={styles.timelineRail}><View style={[styles.timelineDot, first && styles.timelineDotFirst]} />{!last ? <View style={styles.timelineLine} /> : null}</View><View style={styles.timelineCopy}><View style={styles.timelineHeading}><Text style={styles.timelineStatus}>{label(status)}</Text><Text style={styles.timelineDate}>{new Date(occurredAt).toLocaleString("en-BD")}</Text></View><Text style={styles.timelineDescription}>{description}</Text>{location ? <Text style={styles.timelineLocation}>{location}</Text> : null}</View></View>; }
function Choice({ active, disabled, label: text, onPress }: { active: boolean; disabled: boolean; label: string; onPress(): void }) { return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.choice, active && styles.choiceActive]}><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{text}</Text></Pressable>; }
function address(value: NonNullable<VendorOrderDetail["deliveryAddress"]>) { return [value.recipientName, value.line1, value.line2, value.unionName, value.upazila, value.district, value.division, value.postalCode].filter(Boolean).join(", "); }
function pickupDateFor(day: number) { const date = new Date(); date.setDate(date.getDate() + day); date.setHours(9, 0, 0, 0); return date.toISOString(); }
function pickupDayLabel(day: number) { return day === 1 ? "Tomorrow" : new Date(Date.now() + day * 86_400_000).toLocaleDateString("en-BD", { day: "numeric", month: "short" }); }

const styles = StyleSheet.create({
  page: { alignSelf: "center", gap: spacing.md, maxWidth: 1080, width: "100%" },
  flex: { flex: 1, minWidth: 0 },
  back: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 6 },
  link: { color: colors.primary, fontWeight: "700" },
  hero: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", gap: spacing.lg, justifyContent: "space-between", padding: spacing.xl },
  heroCompact: { alignItems: "stretch", flexDirection: "column" },
  statusRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  status: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, color: colors.primary, fontSize: 10, fontWeight: "700", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 6 },
  version: { color: "rgba(250,247,240,.68)", fontSize: 10, fontWeight: "700" },
  title: { color: colors.surface, fontSize: 31, fontWeight: "700", letterSpacing: -0.7, marginTop: spacing.sm },
  heroText: { color: "rgba(250,247,240,.78)", lineHeight: 20, marginTop: 5 },
  heroActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "flex-end" },
  heroActionsCompact: { justifyContent: "flex-start" },
  heroButton: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, flexDirection: "row", gap: 7, minHeight: 44, paddingHorizontal: spacing.md },
  heroButtonPrimary: { backgroundColor: colors.primary },
  heroButtonText: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  light: { color: colors.surface },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metric: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, boxShadow: "0 7px 22px rgba(11,31,58,.06)", flex: 1, flexDirection: "row", gap: spacing.sm, minWidth: 175, padding: spacing.md },
  metricIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 40, justifyContent: "center", width: 40 },
  metricValue: { color: colors.text, fontSize: 18, fontWeight: "700" },
  columns: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  column: { flex: 1, minWidth: 300 },
  full: { flexBasis: "100%", minWidth: 0, width: "100%" },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, boxShadow: "0 8px 24px rgba(11,31,58,.06)", gap: spacing.md, padding: spacing.lg },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  muted: { color: colors.muted, flexShrink: 1, fontSize: 11, lineHeight: 18, marginTop: 3 },
  detail: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" },
  detailLabel: { color: colors.muted, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  value: { color: colors.text, flexShrink: 1, fontWeight: "600", lineHeight: 20, textAlign: "right" },
  strong: { color: colors.accent, fontSize: 17, fontWeight: "700" },
  tableHead: { backgroundColor: colors.navy, borderRadius: radius.md, flexDirection: "row", paddingHorizontal: spacing.sm, paddingVertical: 10 },
  head: { color: colors.surface, fontSize: 9, fontWeight: "700", width: 88 },
  product: { flex: 1, minWidth: 170 },
  productIdentity: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  productCopy: { flex: 1, minWidth: 0 },
  right: { textAlign: "right" },
  line: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.md },
  lineCompact: { alignItems: "flex-start", flexDirection: "column" },
  itemName: { color: colors.text, fontWeight: "700" },
  cell: { color: colors.text, fontSize: 10, width: 88 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.lg },
  danger: { backgroundColor: colors.danger },
  disabled: { opacity: 0.5 },
  primaryText: { color: colors.surface, fontWeight: "700" },
  notice: { backgroundColor: colors.primarySoft, borderRadius: radius.md, color: colors.primaryDark, padding: spacing.md },
  timelineRow: { alignItems: "stretch", flexDirection: "row", gap: spacing.sm },
  timelineRail: { alignItems: "center", width: 20 },
  timelineDot: { backgroundColor: colors.accent, borderColor: colors.surface, borderRadius: radius.pill, borderWidth: 3, height: 14, marginTop: 3, width: 14 },
  timelineDotFirst: { backgroundColor: colors.primary },
  timelineLine: { backgroundColor: colors.border, flex: 1, marginVertical: 2, width: 2 },
  timelineCopy: { borderBottomColor: colors.border, borderBottomWidth: 1, flex: 1, gap: 3, paddingBottom: spacing.md },
  timelineHeading: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" },
  timelineStatus: { color: colors.text, fontSize: 12, fontWeight: "700" },
  timelineDate: { color: colors.muted, fontSize: 10 },
  timelineDescription: { color: colors.text, fontSize: 11, lineHeight: 17 },
  timelineLocation: { color: colors.accent, fontSize: 10, fontWeight: "600" },
  timelineEmpty: { color: colors.muted, fontSize: 11, paddingLeft: 28 },
  exceptionTrigger: { alignItems: "center", alignSelf: "flex-start", borderColor: colors.danger, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, minHeight: 44, paddingHorizontal: spacing.md },
  exceptionTriggerText: { color: colors.danger, fontWeight: "700" },
  exceptionForm: { gap: spacing.sm },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  choice: { borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  choiceActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  choiceText: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  choiceTextActive: { color: colors.primary },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 46, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  notes: { minHeight: 90, textAlignVertical: "top" },
  success: { backgroundColor: colors.primarySoft, borderRadius: radius.md, color: colors.success, padding: spacing.md },
  pickupCurrent: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  error: { backgroundColor: "#fef2f2", borderRadius: radius.md, color: colors.danger, padding: spacing.md },
  center: { alignItems: "center", backgroundColor: colors.background, flex: 1, gap: spacing.md, justifyContent: "center", padding: spacing.xl }
});
