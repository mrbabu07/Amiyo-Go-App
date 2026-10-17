import type { OrderDto } from "@amiyo/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { colors, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { useCurrentUser } from "../auth/use-current-user";
import { cancelCustomerOrder, OperationsRequestError } from "../operations/operations.api";
import { CancelOrderConfirmation } from "./CancelOrderConfirmation";
import { cancellationState } from "./cancellation-policy";
import { pendingOrderActions } from "./order-action.storage";
import { mayDiscardOrderRejection } from "./pending-order-action";

export function InlineOrderCancellation({ order }: { order: OrderDto }) {
  const user = useCurrentUser();
  const router = useRouter();
  const cache = useQueryClient();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [uncertain, setUncertain] = useState(false);
  const mounted = useRef(true);
  const lock = useRef(false);
  useEffect(() => { mounted.current = true; const timer = setInterval(() => setNow(Date.now()), 1000); return () => { mounted.current = false; clearInterval(timer); }; }, []);
  const current = () => mounted.current && user && firebaseAuth?.currentUser?.uid === user.uid;
  const recovery = useQuery({ queryKey: ["return-order-recovery", user?.uid, order.id], queryFn: () => pendingOrderActions.load(user!.uid, order.id), enabled: Boolean(user), retry: false, staleTime: 0 });
  const blocked = uncertain || Boolean(recovery.data) || recovery.isLoading || Boolean(recovery.error);
  const mutation = useMutation({ retry: false, mutationFn: async (reason: string) => {
    if (!current() || blocked || lock.current) throw new Error("Check saved requests before cancelling.");
    if (!cancellationState(order, Date.now()).cancellable) throw new Error("The cancellation window has ended or fulfillment has started.");
    lock.current = true;
    try {
      const saved = await pendingOrderActions.prepare(user!.uid, order.id, { kind: "cancel", input: { reason, expectedVersion: order.version } }, randomUUID());
      if (current()) setUncertain(true);
      if (!current()) throw new Error("Your account changed. Reopen this order.");
      try {
        if (saved.command.kind !== "cancel") throw new Error("Recover the existing order request first.");
        await cancelCustomerOrder(user!, order.id, saved.command.input, saved.key);
      } catch (error) {
        if (error instanceof OperationsRequestError && mayDiscardOrderRejection(saved.fresh, error.status, error.code)) {
          await pendingOrderActions.complete(user!.uid, order.id, saved.key);
          if (current()) setUncertain(false);
        }
        throw error;
      }
      await pendingOrderActions.complete(user!.uid, order.id, saved.key);
      if (current()) { setUncertain(false); setOpen(false); }
    } finally { lock.current = false; }
  }, onSuccess: async () => { if (!user || !current()) return; await cache.invalidateQueries({ queryKey: ["orders", "customer", user.uid] }); await recovery.refetch(); } });
  if (!user) return null;
  const policy = cancellationState(order, now);
  if (!policy.statusAllowsCancel && !blocked) return null;
  return <View style={{ gap: spacing.sm }}>
    {blocked && !mutation.isPending ? <Pressable accessibilityRole="button" onPress={() => router.push(`/order/${order.id}` as never)} style={{ minHeight: 44, padding: spacing.sm }}><Text style={{ color: colors.text }}>Check saved order request</Text></Pressable> : null}
    {policy.cancellable && !open ? <Pressable accessibilityRole="button" disabled={blocked || mutation.isPending} onPress={() => setOpen(true)} style={{ minHeight: 44, padding: spacing.sm }}><Text style={{ color: colors.danger }}>Cancel order · {Math.ceil(policy.remainingMs / 60_000)} min remaining</Text></Pressable> : null}
    {open ? <CancelOrderConfirmation busy={blocked || mutation.isPending} eligible={policy.cancellable} onClose={() => setOpen(false)} onConfirm={(reason) => mutation.mutate(reason)} /> : null}
    {mutation.error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{mutation.error.message}</Text> : null}
  </View>;
}
