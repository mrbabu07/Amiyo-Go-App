import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import type { User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { adjustVendorInventory, getVendorInventory } from "../catalog/catalog.api";

type InventoryItem = Awaited<ReturnType<typeof getVendorInventory>>[number];

function validStock(value: string) {
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function VendorInventoryScreen() {
  const compact = useWindowDimensions().width < 620;
  const user = useCurrentUser();
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const inventoryKey = ["vendor", "inventory", user?.uid] as const;
  const inventory = useQuery({ queryKey: inventoryKey, queryFn: () => getVendorInventory(user!), enabled: Boolean(user), retry: false });

  useEffect(() => { setValues({}); }, [user?.uid]);

  const adjust = useMutation({
    retry: false,
    mutationFn: ({ item, owner, onHand }: { item: InventoryItem; owner: User; onHand: number }) => adjustVendorInventory(owner, item.variantId, { version: item.version, onHand, idempotencyKey: randomUUID(), reason: "Seller center stock adjustment" }),
    onSuccess: async (_data, variables) => {
      if (activeUid.current !== variables.owner.uid) return;
      setValues((current) => {
        const next = { ...current };
        delete next[variables.item.id];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ["vendor", "inventory", variables.owner.uid] });
    }
  });

  return <Screen eyebrow="SELLER CENTER" title="Inventory" description="Update authoritative stock while reservations remain protected.">
    {inventory.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
    {inventory.error || adjust.error ? <Text accessibilityRole="alert" style={styles.error}>{(inventory.error || adjust.error)?.message}</Text> : null}
    {inventory.data?.map((item) => {
      const value = values[item.id] ?? String(item.onHand);
      const onHand = validStock(value);
      const saving = adjust.isPending && adjust.variables?.item.id === item.id;
      return <ModuleCard key={item.id} title={item.productName} meta={`${item.sku} · ${item.available} available · ${item.reserved} reserved`}>
        <View style={[styles.row, compact && styles.rowCompact]}>
          <TextInput accessibilityLabel={`On-hand stock for ${item.productName}`} inputMode="numeric" onChangeText={(next) => setValues((current) => ({ ...current, [item.id]: next }))} style={[styles.input, compact && styles.inputCompact, onHand === null && styles.invalid]} value={value} />
          <Pressable accessibilityRole="button" disabled={!user || onHand === null || adjust.isPending} onPress={() => adjust.mutate({ item, owner: user!, onHand: onHand! })} style={[styles.button, compact && styles.buttonCompact, (!user || onHand === null || adjust.isPending) && styles.disabled]}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Update stock</Text>}</Pressable>
        </View>
        {onHand === null ? <Text style={styles.error}>Enter a whole stock quantity of zero or more.</Text> : null}
        {item.available <= item.reorderLevel ? <Text style={styles.warning}>Low stock: reorder level {item.reorderLevel}</Text> : null}
      </ModuleCard>;
    })}
    {inventory.data?.length === 0 ? <ModuleCard title="No inventory yet" meta="Create and publish a product variant to manage its stock here." /> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  rowCompact: { flexDirection: "column" },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, flex: 1, minHeight: 44, minWidth: 150, paddingHorizontal: 12 },
  inputCompact: { flex: 0, minWidth: 0, width: "100%" },
  invalid: { borderColor: colors.danger },
  button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 44, minWidth: 130, paddingHorizontal: spacing.md },
  buttonCompact: { width: "100%" },
  buttonText: { color: "#fff", fontWeight: "700" },
  disabled: { opacity: .5 },
  warning: { color: colors.warning, fontWeight: "600" },
  error: { color: colors.danger }
});
