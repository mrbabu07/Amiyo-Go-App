import type { AdminOrderDetail } from "@amiyo/contracts";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "../auth/use-current-user";
import { approveOrderSettlement } from "../operations/operations.api";
import { colors, spacing } from "../../ui/tokens";

export function AdminOrderSettlement({ order }: { order: AdminOrderDetail }) {
  const user = useCurrentUser();
  const userId = user?.uid ?? null;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const [selected, setSelected] = useState("");
  const [shipping, setShipping] = useState<"VENDOR" | "PLATFORM" | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const cache = useQueryClient();
  const approve = async () => {
    const actor = user;
    const actorId = userId;
    const packageOrder = order.vendorOrders.find((item) => item.id === selected);
    if (!actor || !actorId || actor.uid !== actorId || !packageOrder || !shipping || busy) return;
    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim())) { setMessage("Enter the reconciled amount in BDT, with at most two decimals."); return; }
    const [whole, fraction = ""] = amount.trim().split(".");
    const expectedAmountMinor = (BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, "0"))).toString();
    setBusy(true); setMessage("");
    try {
      const result = await approveOrderSettlement(actor, selected, { expectedVersion: packageOrder.version, expectedAmountMinor, shippingRecipient: shipping, reason });
      if (userIdRef.current !== actorId) return;
      setMessage(result.alreadySettled ? "This package was already credited. No duplicate credit was created." : "Approved: seller wallet credited. This does not transfer money to the seller's bank.");
      await cache.invalidateQueries({ queryKey: ["vendor-finance", actorId] });
    } catch (error) { if (userIdRef.current === actorId) setMessage(error instanceof Error ? error.message : "Settlement approval failed"); }
    finally { if (userIdRef.current === actorId) setBusy(false); }
  };
  return <View style={styles.panel}>
    <Text style={styles.title}>Finance approval: seller settlement</Text>
    <Text style={styles.text}>Finance admins only. Select a delivered package and confirm the reconciled net amount: subtotal minus discount and commission, plus shipping only if payable to the seller, reduced proportionally for completed refunds. Payment, return-window and hold checks run on the server. Pending disputes or unreconciled refunds block approval.</Text>
    {order.vendorOrders.filter((item) => item.status === "DELIVERED").map((item, index) => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: selected === item.id }} disabled={busy} onPress={() => { setSelected(item.id); setAmount(""); setMessage(""); }} style={styles.option}><Text style={styles.text}>{selected === item.id ? "Selected: " : "Select: "}Package {index + 1} — {item.id}</Text></Pressable>)}
    <Text style={styles.text}>Who receives the delivery fee?</Text>
    {(["VENDOR", "PLATFORM"] as const).map((recipient) => <Pressable key={recipient} accessibilityRole="radio" accessibilityState={{ checked: shipping === recipient }} disabled={busy} onPress={() => setShipping(recipient)} style={styles.option}><Text style={styles.text}>{shipping === recipient ? "Selected: " : ""}{recipient}</Text></Pressable>)}
    <Text style={styles.text}>Reconciled net amount (BDT)</Text>
    <TextInput accessibilityLabel="Settlement amount in BDT" value={amount} onChangeText={setAmount} editable={!busy} keyboardType="decimal-pad" style={styles.input} />
    <Text style={styles.text}>Approval reason (at least 10 characters)</Text>
    <TextInput accessibilityLabel="Settlement approval reason" value={reason} onChangeText={setReason} editable={!busy} maxLength={1000} multiline style={styles.input} />
    <Pressable accessibilityRole="button" disabled={busy || !selected || !shipping || reason.trim().length < 10} onPress={approve} style={styles.button}><Text style={styles.buttonText}>{busy ? "Checking settlement..." : "Approve seller wallet credit"}</Text></Pressable>
    {message ? <Text accessibilityRole="alert" style={styles.text}>{message}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({ panel: { padding: spacing.md, gap: spacing.sm, borderRadius: 12, backgroundColor: colors.surface }, title: { color: colors.text, fontSize: 18, fontWeight: "600" }, text: { color: colors.text }, option: { padding: 12, minHeight: 44, backgroundColor: colors.background, borderRadius: 8 }, input: { color: colors.text, padding: 12, minHeight: 44, borderWidth: 1, borderColor: colors.border }, button: { backgroundColor: colors.primary, padding: 14, minHeight: 44, borderRadius: 8 }, buttonText: { color: "#fff", fontWeight: "600" } });
