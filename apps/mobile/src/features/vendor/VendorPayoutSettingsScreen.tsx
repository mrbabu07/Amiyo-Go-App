import { saveVendorBankAccountSchema, type SaveVendorBankAccount } from "@amiyo/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "firebase/auth";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getVendorWorkspace, saveVendorBankAccount } from "./vendor.api";

const providers = ["BANK", "BKASH", "NAGAD", "ROCKET"] as const;
type Provider = (typeof providers)[number];
const emptyForm = { provider: "BANK" as Provider, accountName: "", accountNumber: "", confirmAccountNumber: "" };

export function VendorPayoutSettingsScreen() {
  const user = useCurrentUser();
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;
  const compact = useWindowDimensions().width < 620;
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const workspaceKey = ["vendor", "workspace", user?.uid] as const;
  const workspace = useQuery({ queryKey: workspaceKey, queryFn: () => getVendorWorkspace(user!), enabled: Boolean(user), retry: false });
  useEffect(() => { setForm(emptyForm); }, [user?.uid]);
  const parsed = saveVendorBankAccountSchema.safeParse({ provider: form.provider, accountName: form.accountName, accountNumber: form.accountNumber, isDefault: true });
  const matches = form.accountNumber.length > 0 && form.accountNumber === form.confirmAccountNumber;
  const save = useMutation({
    retry: false,
    mutationFn: ({ owner, payload }: { owner: User; payload: SaveVendorBankAccount }) => saveVendorBankAccount(owner, payload),
    onSuccess: async (_data, variables) => {
      if (activeUid.current !== variables.owner.uid) return;
      setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: ["vendor", "workspace", variables.owner.uid] });
    }
  });
  return <Screen eyebrow="SELLER CENTER" title="Bank & payout settings" description="Manage verified payout destinations for seller withdrawals.">
    <ModuleCard title="Payout security" meta="Account numbers are encrypted at rest."><Text style={styles.body}>Use an account owned by you or your registered business. Saved numbers remain masked and cannot be viewed in full.</Text></ModuleCard>
    <ModuleCard title="Saved payout accounts" meta={`${workspace.data?.bankAccounts.length ?? 0} account(s)`}>{workspace.isLoading ? <ActivityIndicator color={colors.primary} /> : null}{workspace.error ? <Text accessibilityRole="alert" style={styles.error}>{workspace.error.message}</Text> : null}{workspace.data?.bankAccounts.map((account) => <View key={account.id} style={[styles.account, compact && compactStyles.account]}><View style={compactStyles.accountCopy}><Text numberOfLines={1} style={styles.accountName}>{account.provider} · {account.accountNumberMasked}</Text><Text numberOfLines={1} style={styles.muted}>{account.accountName}</Text></View><Text style={[styles.badge, account.verifiedAt ? styles.verified : styles.pending]}>{account.verifiedAt ? "Verified" : account.isDefault ? "Default" : "Saved"}</Text></View>)}{!workspace.isLoading && !workspace.data?.bankAccounts.length ? <Text style={styles.muted}>No payout account saved yet.</Text> : null}</ModuleCard>
    <ModuleCard title="Add payout account" meta="The newest account becomes your default."><Text style={styles.label}>Payout method</Text><View style={styles.providers}>{providers.map((provider) => <Pressable accessibilityRole="button" key={provider} onPress={() => setForm((current) => ({ ...current, provider }))} style={[styles.chip, form.provider === provider && styles.activeChip]}><Text style={[styles.chipText, form.provider === provider && styles.activeChipText]}>{provider === "BANK" ? "Bank transfer" : provider}</Text></Pressable>)}</View><Field autoComplete="name" label={form.provider === "BANK" ? "Bank account name" : "Account holder name"} onChangeText={(accountName) => setForm((current) => ({ ...current, accountName }))} value={form.accountName} /><Field autoComplete="off" inputMode="numeric" label={form.provider === "BANK" ? "Bank account number" : `${form.provider} number`} onChangeText={(accountNumber) => setForm((current) => ({ ...current, accountNumber }))} secureTextEntry value={form.accountNumber} /><Field autoComplete="off" inputMode="numeric" label="Confirm account number" onChangeText={(confirmAccountNumber) => setForm((current) => ({ ...current, confirmAccountNumber }))} secureTextEntry value={form.confirmAccountNumber} />{form.confirmAccountNumber && !matches ? <Text accessibilityRole="alert" style={styles.error}>Account numbers do not match.</Text> : null}{!parsed.success && (form.accountName || form.accountNumber) ? <Text style={styles.help}>Enter an account holder name and an account number between 8 and 40 characters.</Text> : null}<Pressable accessibilityRole="button" disabled={!user || !parsed.success || !matches || save.isPending} onPress={() => save.mutate({ owner: user!, payload: parsed.success ? parsed.data : { provider: "BANK", accountName: "", accountNumber: "", isDefault: true } })} style={[styles.button, (!user || !parsed.success || !matches || save.isPending) && styles.disabled]}>{save.isPending ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.buttonText}>Save payout account</Text>}</Pressable>{save.error ? <Text accessibilityRole="alert" style={styles.error}>{save.error.message}</Text> : null}</ModuleCard>
    {save.isSuccess || Boolean(workspace.data?.bankAccounts.length) ? <View style={styles.finishCard}><View style={styles.finishIcon}><Text style={styles.finishIconText}>✓</Text></View><View style={styles.finishCopy}><Text style={styles.finishTitle}>Seller setup is ready</Text><Text style={styles.muted}>Open your dashboard to add products, review orders and track approval.</Text></View><Pressable accessibilityRole="button" onPress={() => router.replace("/vendor")} style={[styles.finishButton, compact && styles.finishButtonCompact]}><Text style={styles.buttonText}>Open seller dashboard</Text></Pressable></View> : null}
  </Screen>;
}

function Field({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} style={styles.input} {...props} /></View>; }
const compactStyles = StyleSheet.create({ account: { alignItems: "flex-start", gap: spacing.sm }, accountCopy: { flex: 1, minWidth: 0 } });
const styles = StyleSheet.create({ body: { color: colors.text, lineHeight: 21 }, muted: { color: colors.muted, fontSize: 12 }, account: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm }, accountName: { color: colors.text, fontWeight: "700" }, badge: { borderRadius: radius.pill, fontSize: 10, fontWeight: "700", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5 }, verified: { backgroundColor: colors.accentSoft, color: colors.success }, pending: { backgroundColor: colors.primarySoft, color: colors.primary }, providers: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, chip: { borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 }, activeChip: { backgroundColor: colors.primary, borderColor: colors.primary }, chipText: { color: colors.text, fontSize: 11, fontWeight: "600" }, activeChipText: { color: colors.surface }, field: { gap: 5 }, label: { color: colors.text, fontSize: 12, fontWeight: "600" }, input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 46, paddingHorizontal: 12 }, button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 46 }, disabled: { opacity: .45 }, buttonText: { color: colors.surface, fontWeight: "700" }, finishCard: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.xl, flexDirection: "row", flexWrap: "wrap", gap: spacing.md, padding: spacing.lg }, finishIcon: { alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.pill, height: 42, justifyContent: "center", width: 42 }, finishIconText: { color: colors.surface, fontSize: 20, fontWeight: "700" }, finishCopy: { flex: 1, minWidth: 200 }, finishTitle: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: 3 }, finishButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.md }, finishButtonCompact: { width: "100%" }, error: { color: colors.danger, fontSize: 12 }, help: { color: colors.muted, fontSize: 11 } });
