import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@firebase/auth";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getCategories } from "../catalog/catalog.api";
import { createVendorCategoryRequest, getVendorCategoryRequests } from "./vendor.api";

export function VendorCategoryRequestsScreen() {
  const user = useCurrentUser();
  const compact = useWindowDimensions().width < 620;
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;
  const cache = useQueryClient();
  const categories = useQuery({ queryKey: ["catalog", "categories"], queryFn: getCategories });
  const requests = useQuery({ queryKey: ["vendor", "category-requests", user?.uid], queryFn: () => getVendorCategoryRequests(user!), enabled: Boolean(user), retry: false });
  const [categoryId, setCategoryId] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => { setCategoryId(""); setReason(""); }, [user?.uid]);

  const create = useMutation({
    retry: false,
    mutationFn: (owner: User) => createVendorCategoryRequest(owner, { categoryId, reason: reason.trim() }),
    onSuccess: async (_data, owner) => {
      if (activeUid.current !== owner.uid) return;
      setReason("");
      setCategoryId("");
      await cache.invalidateQueries({ queryKey: ["vendor", "category-requests", owner.uid] });
    }
  });

  return <Screen eyebrow="SELLER ACCESS" title="Category requests" description="Request approval to sell within an existing marketplace category.">
    <ModuleCard title="New request" meta="Select a category and explain the product assortment you plan to list.">
      <ScrollView contentContainerStyle={styles.chips} horizontal={compact} showsHorizontalScrollIndicator={false}>{categories.data?.map((category) => <Pressable key={category.id} onPress={() => setCategoryId(category.id)} style={[styles.chip, categoryId === category.id && styles.active]}><Text numberOfLines={1} style={[styles.chipText, categoryId === category.id && styles.activeText]}>{category.name}</Text></Pressable>)}</ScrollView>
      <TextInput maxLength={500} multiline onChangeText={setReason} placeholder="Why does your shop need this category?" placeholderTextColor={colors.muted} style={styles.input} value={reason} />
      <Pressable disabled={!user || !categoryId || reason.trim().length < 5 || create.isPending} onPress={() => create.mutate(user!)} style={[styles.primary, compact && styles.primaryCompact, (!user || !categoryId || reason.trim().length < 5 || create.isPending) && styles.disabled]}><Text style={styles.primaryText}>{create.isPending ? "Submitting..." : "Submit request"}</Text></Pressable>
      {create.error ? <Text accessibilityRole="alert" style={styles.error}>{create.error.message}</Text> : null}
    </ModuleCard>
    {requests.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
    {requests.data?.map((request) => <ModuleCard key={request.id} title={request.categoryPath} meta={`${request.status.toUpperCase()} - ${new Date(request.createdAt).toLocaleDateString("en-BD")}`}><Text style={styles.body}>{request.reason}</Text>{request.reviewReason ? <Text style={styles.muted}>Admin: {request.reviewReason}</Text> : null}</ModuleCard>)}
    {requests.error ? <Text accessibilityRole="alert" style={styles.error}>{requests.error.message}</Text> : null}
  </Screen>;
}

const styles = StyleSheet.create({ chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, chip: { borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, active: { backgroundColor: colors.primarySoft, borderColor: colors.primary }, chipText: { color: colors.muted, fontWeight: "700" }, activeText: { color: colors.primary }, input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 100, padding: spacing.md, textAlignVertical: "top" }, primary: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 46, paddingHorizontal: spacing.xl }, primaryCompact: { alignSelf: "stretch" }, disabled: { opacity: 0.45 }, primaryText: { color: colors.surface, fontWeight: "700" }, body: { color: colors.text }, muted: { color: colors.muted }, error: { color: colors.danger } });
