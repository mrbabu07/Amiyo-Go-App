import type { User } from "@firebase/auth";
import { randomUUID } from "expo-crypto";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { colors, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getVendorOrder, OrdersRequestError, transitionVendorOrder } from "./orders.api";
import { mayDiscardVendorTransition } from "./pending-vendor-transition";
import { vendorTransitionRecovery } from "./vendor-transition.storage";
import { eligibleSellerPackages, runSellerBatch, sellerBulkActions, type SellerBulkAction } from "./vendor-bulk-actions";

export function VendorBulkActions({ user, rows }: { user: User; rows: Array<{ id: string; status: string; shopName: string; orderNumber: string }> }) {
  const current = useCurrentUser();
  const actor = useRef(current?.uid);
  actor.current = current?.uid;
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const cache = useQueryClient();
  const [plan, setPlan] = useState<{ action: SellerBulkAction; ids: string[] } | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [error, setError] = useState("");
  const active = () => alive.current && actor.current === user.uid;
  async function confirm() {
    if (!plan || running.current) return;
    running.current = true; setBusy(true); setError("");
    try {
      const remaining = plan.ids.filter((id) => !done.includes(id));
      await runSellerBatch(remaining, async (id) => {
        const saved = await vendorTransitionRecovery.load(user.uid, id);
        const latest = saved ? null : await getVendorOrder(user, id);
        if (!active()) throw new Error("Account changed.");
        if (latest && latest.status !== sellerBulkActions[plan.action].from) throw new Error("Package status changed. Refresh and review the selection.");
        await vendorTransitionRecovery.run(user.uid, id, saved?.input ?? { status: plan.action, expectedVersion: latest!.version, reason: `Seller bulk ${plan.action}` }, randomUUID(), (input, key) => {
          if (!active()) throw new Error("Account changed.");
          if (input.status !== plan.action) throw new Error("Recover the previous package action in order details first.");
          return transitionVendorOrder(user, id, input, key);
        }, (failure, fresh) => failure instanceof OrdersRequestError && mayDiscardVendorTransition(fresh, failure.status, failure.code));
      }, active, (id) => setDone((previous) => [...previous, id]));
    } catch (failure) { if (active()) setError(failure instanceof Error ? failure.message : "Batch stopped. Review the pending package before retrying."); }
    finally { running.current = false; if (active()) { setBusy(false); await cache.invalidateQueries({ queryKey: ["orders", "vendor", user.uid] }); } }
  }
  return <View style={{ gap: spacing.sm }}><Text style={{ color: colors.text, fontWeight: "600" }}>Bulk fulfillment</Text><Text style={{ color: colors.muted }}>Only eligible selected packages change. Courier pickup and cash collection stay with operations.</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>{(Object.keys(sellerBulkActions) as SellerBulkAction[]).map((action) => {
    const eligible = eligibleSellerPackages(rows, action);
    return <Pressable key={action} accessibilityRole="button" disabled={busy || !eligible.length || Boolean(plan && done.length < plan.ids.length)} onPress={() => { setPlan({ action, ids: eligible.map((row) => row.id) }); setDone([]); setError(""); }} style={{ backgroundColor: colors.primarySoft, borderRadius: 10, minHeight: 44, padding: spacing.md }}><Text style={{ color: colors.primary }}>{sellerBulkActions[action].label} ({eligible.length})</Text></Pressable>;
  })}</View>{plan ? <View style={{ gap: spacing.sm }}><Text style={{ color: colors.text }}>{sellerBulkActions[plan.action].label}: {plan.ids.length} packages · {done.length} confirmed</Text>{plan.ids.map((id) => <Text key={id} style={{ color: colors.muted }}>{done.includes(id) ? "✓" : "○"} {rows.find((row) => row.id === id)?.orderNumber ?? id} · {rows.find((row) => row.id === id)?.shopName}</Text>)}{done.length < plan.ids.length ? <Pressable accessibilityRole="button" disabled={busy} onPress={confirm} style={{ backgroundColor: colors.primary, borderRadius: 10, minHeight: 44, padding: spacing.md }}><Text style={{ color: colors.onPrimary }}>{busy ? "Updating…" : error ? "Retry remaining with saved keys" : "Confirm selected updates"}</Text></Pressable> : null}{!busy && !error ? <Pressable accessibilityRole="button" onPress={() => setPlan(null)} style={{ padding: spacing.md, minHeight: 44 }}><Text style={{ color: colors.primary }}>Close review</Text></Pressable> : null}</View> : null}{error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}</View>;
}
