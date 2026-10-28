import type { User } from "@firebase/auth";
import { useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { colors, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getVendorOrder, OrdersRequestError, transitionVendorOrder } from "./orders.api";
import { mayDiscardVendorTransition } from "./pending-vendor-transition";
import { vendorBatchRecovery } from "./vendor-batch.storage";
import { eligibleSellerPackages, runSellerBatch, sellerBulkActions, type SellerBulkAction } from "./vendor-bulk-actions";
import { vendorTransitionRecovery } from "./vendor-transition.storage";

type BatchPlan = { action: SellerBulkAction; ids: string[] };
type OrderRow = { id: string; status: string; shopName: string; orderNumber: string };

export function VendorBulkActions({ user, rows }: { user: User; rows: OrderRow[] }) {
  const current = useCurrentUser();
  const actor = useRef(current?.uid); actor.current = current?.uid;
  const alive = useRef(true);
  const running = useRef(false);
  const cache = useQueryClient();
  const [plan, setPlan] = useState<BatchPlan | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = () => alive.current && actor.current === user.uid;

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let mounted = true;
    setPlan(null); setDone([]); setError("");
    void vendorBatchRecovery.load(user.uid).then((saved) => {
      if (!mounted || !active() || !saved) return;
      setPlan({ action: saved.action, ids: saved.ids }); setDone(saved.completedIds);
    }).catch((failure) => { if (mounted && active()) setError(failure instanceof Error ? failure.message : "Saved seller batch could not be restored."); });
    return () => { mounted = false; };
  }, [user.uid]);

  async function review(action: SellerBulkAction, ids: string[]) {
    setError("");
    try {
      const saved = await vendorBatchRecovery.start(user.uid, action, ids);
      if (active()) { setPlan({ action: saved.action, ids: saved.ids }); setDone(saved.completedIds); }
    } catch (failure) { if (active()) setError(failure instanceof Error ? failure.message : "Seller batch could not be saved."); }
  }

  async function confirm() {
    if (!plan || running.current) return;
    running.current = true; setBusy(true); setError("");
    try {
      const remaining = plan.ids.filter((id) => !done.includes(id));
      await runSellerBatch(remaining, async (id) => {
        const saved = await vendorTransitionRecovery.load(user.uid, id);
        const latest = saved ? null : await getVendorOrder(user, id);
        if (!active()) throw new Error("Account changed.");
        if (latest?.status === plan.action) return;
        if (latest && latest.status !== sellerBulkActions[plan.action].from) throw new Error("Package status changed. Refresh and review the selection.");
        await vendorTransitionRecovery.run(user.uid, id, saved?.input ?? { status: plan.action, expectedVersion: latest!.version, reason: `Seller bulk ${plan.action}` }, randomUUID(), (input, key) => {
          if (!active()) throw new Error("Account changed.");
          if (input.status !== plan.action) throw new Error("Recover the previous package action in order details first.");
          return transitionVendorOrder(user, id, input, key);
        }, (failure, fresh) => failure instanceof OrdersRequestError && mayDiscardVendorTransition(fresh, failure.status, failure.code));
      }, active, async (id) => {
        const saved = await vendorBatchRecovery.complete(user.uid, id);
        if (active()) setDone(saved.completedIds);
      });
    } catch (failure) {
      if (active()) setError(failure instanceof Error ? failure.message : "Batch stopped. Review the pending package before retrying.");
    } finally {
      running.current = false;
      if (active()) { setBusy(false); await cache.invalidateQueries({ queryKey: ["orders", "vendor", user.uid] }); }
    }
  }

  async function discard() {
    try {
      await vendorBatchRecovery.clear(user.uid);
      if (active()) { setPlan(null); setDone([]); setError(""); }
    } catch (failure) { if (active()) setError(failure instanceof Error ? failure.message : "Saved seller batch could not be discarded."); }
  }

  return <View style={{ gap: spacing.sm }}>
    <Text style={{ color: colors.text, fontWeight: "600" }}>Bulk fulfillment</Text>
    <Text style={{ color: colors.muted }}>Only eligible selected packages change. Courier pickup and cash collection stay with operations.</Text>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
      {(Object.keys(sellerBulkActions) as SellerBulkAction[]).map((action) => {
        const eligible = eligibleSellerPackages(rows, action);
        return <Pressable key={action} accessibilityRole="button" disabled={busy || !eligible.length || Boolean(plan)} onPress={() => void review(action, eligible.map((row) => row.id))} style={{ backgroundColor: colors.primarySoft, borderRadius: 10, minHeight: 44, padding: spacing.md }}><Text style={{ color: colors.primary }}>{sellerBulkActions[action].label} ({eligible.length})</Text></Pressable>;
      })}
    </View>
    {plan ? <View style={{ gap: spacing.sm }}>
      <Text style={{ color: colors.text }}>{sellerBulkActions[plan.action].label}: {plan.ids.length} packages · {done.length} confirmed</Text>
      {plan.ids.map((id) => { const row = rows.find((candidate) => candidate.id === id); return <Text key={id} style={{ color: colors.muted }}>{done.includes(id) ? "✓" : "○"} {row?.orderNumber ?? id}{row?.shopName ? ` · ${row.shopName}` : ""}</Text>; })}
      {done.length < plan.ids.length ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => void confirm()} style={{ backgroundColor: colors.primary, borderRadius: 10, minHeight: 44, padding: spacing.md }}><Text style={{ color: colors.onPrimary }}>{busy ? "Updating…" : error ? "Retry remaining with saved keys" : "Confirm selected updates"}</Text></Pressable> : null}
      {!busy ? <Pressable accessibilityRole="button" onPress={() => void discard()} style={{ minHeight: 44, padding: spacing.md }}><Text style={{ color: colors.primary }}>{done.length === plan.ids.length ? "Close completed batch" : "Discard saved batch plan"}</Text></Pressable> : null}
    </View> : null}
    {!plan && error ? <Pressable accessibilityRole="button" onPress={() => void discard()} style={{ minHeight: 44, padding: spacing.md }}><Text style={{ color: colors.primary }}>Discard unreadable saved batch</Text></Pressable> : null}
    {error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}
  </View>;
}
