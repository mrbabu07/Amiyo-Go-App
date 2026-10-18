import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { pickAndUploadDocument, waitForMediaUploadReady } from "../media/media.api";
import { getVendorWorkspace, saveVendorBankAccount, submitVendorKyc, updateVendorShop } from "./vendor.api";

const emptyBank = { provider: "BANK" as "BANK" | "BKASH" | "NAGAD" | "ROCKET", accountName: "", accountNumber: "" };
const emptyDocument = { storageKey: "", checksum: "", mimeType: "application/pdf", originalName: "" };

export function VendorSettingsScreen() {
  const compact = useWindowDimensions().width < 620;
  const router = useRouter();
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;
  const workspace = useQuery({ queryKey: ["vendor", "workspace", user?.uid], queryFn: () => getVendorWorkspace(user!), enabled: Boolean(user), retry: false });
  const shop = workspace.data?.shops[0];
  const [shopName, setShopName] = useState("");
  const [description, setDescription] = useState("");
  const [bank, setBank] = useState(emptyBank);
  const [document, setDocument] = useState(emptyDocument);

  useEffect(() => {
    if (shop) { setShopName(shop.name); setDescription(shop.description ?? ""); }
  }, [shop?.id, shop?.name, shop?.description, shop?.version, user?.uid]);
  useEffect(() => { setBank(emptyBank); setDocument(emptyDocument); }, [user?.uid]);

  const refresh = (owner: User) => queryClient.invalidateQueries({ queryKey: ["vendor", "workspace", owner.uid] });
  const saveShop = useMutation({
    retry: false,
    mutationFn: ({ owner, shopId, version }: { owner: User; shopId: string; version: number }) => updateVendorShop(owner, shopId, { version, name: shopName, description: description || null }),
    onSuccess: async (_data, variables) => { if (activeUid.current === variables.owner.uid) await refresh(variables.owner); }
  });
  const saveBank = useMutation({
    retry: false,
    mutationFn: ({ owner }: { owner: User }) => saveVendorBankAccount(owner, { ...bank, isDefault: true }),
    onSuccess: async (_data, variables) => {
      if (activeUid.current !== variables.owner.uid) return;
      setBank(emptyBank);
      await refresh(variables.owner);
    }
  });
  const uploadKyc = useMutation({
    retry: false,
    mutationFn: async ({ owner }: { owner: User }) => {
      const result = await pickAndUploadDocument(owner, "kyc");
      if (result) await waitForMediaUploadReady(owner, result.id);
      return { owner, result };
    },
    onSuccess: ({ owner, result }) => {
      if (result && activeUid.current === owner.uid) setDocument({ storageKey: result.storageKey, checksum: result.checksum, mimeType: result.mimeType, originalName: result.originalName });
    }
  });
  const saveKyc = useMutation({
    retry: false,
    mutationFn: ({ owner }: { owner: User }) => submitVendorKyc(owner, { documents: [{ documentType: "TRADE_LICENSE", storageKey: document.storageKey, mimeType: document.mimeType, checksum: document.checksum }] }),
    onSuccess: async (_data, variables) => { if (activeUid.current === variables.owner.uid) await refresh(variables.owner); }
  });

  if (workspace.isLoading) return <Screen title="Vendor settings"><ActivityIndicator color={colors.primary} /></Screen>;
  const error = [workspace.error, saveShop.error, saveBank.error, uploadKyc.error, saveKyc.error].find(Boolean);
  const readinessChecks = [shop?.status === "ACTIVE", workspace.data?.kycSubmissions[0]?.status === "APPROVED", Boolean(workspace.data?.bankAccounts.length)];
  const readiness = Math.round((readinessChecks.filter(Boolean).length / readinessChecks.length) * 100);
  return <Screen eyebrow="SELLER CENTER" title={workspace.data?.displayName || "Vendor settings"} description={`Account status: ${workspace.data?.status || "UNKNOWN"}`}>
    <View style={[styles.hero, compact && styles.heroCompact]}><View style={styles.heroCopy}><Text style={styles.heroEyebrow}>SELLER READINESS</Text><Text style={styles.heroTitle}>Complete your operating setup</Text><Text style={styles.heroText}>Storefront, identity verification and payout details must stay current for uninterrupted selling.</Text></View><View style={styles.readiness}><Text style={styles.readinessValue}>{readiness}%</Text><Text style={styles.readinessLabel}>ready</Text></View></View>
    <View style={[styles.summary, compact && styles.summaryCompact]}>
      <Summary icon="storefront-outline" label="Storefront" onPress={() => router.push("/vendor/shop/profile")} value={shop?.status || "Draft"} ready={shop?.status === "ACTIVE"} />
      <Summary icon="shield-checkmark-outline" label="KYC" onPress={() => router.push("/vendor/kyc")} value={workspace.data?.kycSubmissions[0]?.status || "Required"} ready={workspace.data?.kycSubmissions[0]?.status === "APPROVED"} />
      <Summary icon="wallet-outline" label="Payout" onPress={() => router.push("/vendor/payout-settings")} value={workspace.data?.bankAccounts.length ? "Configured" : "Required"} ready={Boolean(workspace.data?.bankAccounts.length)} />
    </View>
    <ModuleCard title="Shop profile" meta={shop?.slug}>
      <Field label="Shop name" value={shopName} onChangeText={setShopName} />
      <Field label="Description" multiline value={description} onChangeText={setDescription} />
      <Action busy={saveShop.isPending} disabled={!user || !shop} label="Save shop" onPress={() => user && shop && saveShop.mutate({ owner: user, shopId: shop.id, version: shop.version })} />
    </ModuleCard>
    <ModuleCard title="KYC verification" meta={workspace.data?.kycSubmissions[0] ? `Latest: ${workspace.data.kycSubmissions[0].status}` : "No submission yet"}>
      <Text style={styles.muted}>Trade-license files use private signed uploads and are verified before submission.</Text>
      <Action busy={uploadKyc.isPending} disabled={!user} label={document.storageKey ? "Replace trade license" : "Choose trade license"} onPress={() => user && uploadKyc.mutate({ owner: user })} />
      {document.storageKey ? <Text style={styles.file}>Ready: {document.originalName}</Text> : null}
      <Action busy={saveKyc.isPending} disabled={!user || !document.storageKey || !document.checksum} label="Submit KYC" onPress={() => user && saveKyc.mutate({ owner: user })} />
    </ModuleCard>
    <ModuleCard title="Payout accounts" meta="Full account numbers are encrypted and never returned.">
      {workspace.data?.bankAccounts.map((account) => <View key={account.id} style={styles.account}><Text style={styles.accountName}>{account.provider} · {account.accountNumberMasked}</Text><Text style={styles.muted}>{account.accountName}{account.isDefault ? " · Default" : ""}</Text></View>)}
      <View style={styles.providers}>{(["BANK", "BKASH", "NAGAD", "ROCKET"] as const).map((provider) => <Pressable key={provider} onPress={() => setBank({ ...bank, provider })} style={[styles.chip, bank.provider === provider && styles.active]}><Text style={[styles.chipText, bank.provider === provider && styles.activeText]}>{provider}</Text></Pressable>)}</View>
      <Field label="Account name" value={bank.accountName} onChangeText={(accountName) => setBank({ ...bank, accountName })} />
      <Field label="Account number" secureTextEntry value={bank.accountNumber} onChangeText={(accountNumber) => setBank({ ...bank, accountNumber })} />
      <Action busy={saveBank.isPending} disabled={!user || !bank.accountName.trim() || !bank.accountNumber.trim()} label="Save payout account" onPress={() => user && saveBank.mutate({ owner: user })} />
      {error ? <Text style={styles.error}>{error.message}</Text> : null}
    </ModuleCard>
  </Screen>;
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) { const { label, ...rest } = props; return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor={colors.muted} style={[styles.input, rest.multiline && styles.multiline]} {...rest} /></View>; }
function Action({ busy, disabled, label, onPress }: { busy: boolean; disabled?: boolean; label: string; onPress(): void }) { return <Pressable disabled={busy || disabled} onPress={onPress} style={[styles.button, (busy || disabled) && styles.disabled]}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{label}</Text>}</Pressable>; }
function Summary({ icon, label, onPress, ready, value }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; onPress(): void; ready: boolean; value: string }) { return <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => [styles.summaryCard, pressed && styles.summaryPressed]}><View style={[styles.summaryIcon, ready && styles.summaryIconReady]}><Ionicons color={ready ? colors.success : colors.primary} name={icon} size={20} /></View><View style={styles.summaryCopy}><Text style={styles.summaryLabel}>{label}</Text><Text numberOfLines={1} style={[styles.summaryValue, ready && styles.summaryValueReady]}>{value.replaceAll("_", " ")}</Text></View><Ionicons color={colors.muted} name="chevron-forward" size={17} /></Pressable>; }

const styles = StyleSheet.create({
  hero: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", gap: spacing.lg, justifyContent: "space-between", padding: spacing.xl }, heroCompact: { alignItems: "flex-start", flexDirection: "column", padding: spacing.lg }, heroCopy: { flex: 1, gap: 5 }, heroEyebrow: { color: colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 1.2 }, heroTitle: { color: colors.background, fontSize: 21, fontWeight: "700" }, heroText: { color: colors.background, fontSize: 12, lineHeight: 18, opacity: 0.8 }, readiness: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.lg, minWidth: 90, padding: spacing.md }, readinessValue: { color: colors.success, fontSize: 26, fontWeight: "700" }, readinessLabel: { color: colors.navy, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  summary: { flexDirection: "row", gap: spacing.md }, summaryCompact: { flexDirection: "column" }, summaryCard: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, boxShadow: "0 8px 24px rgba(11,31,58,.06)", flex: 1, flexDirection: "row", gap: spacing.sm, minHeight: 78, padding: spacing.md }, summaryPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] }, summaryIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 42, justifyContent: "center", width: 42 }, summaryIconReady: { backgroundColor: colors.accentSoft }, summaryCopy: { flex: 1, minWidth: 0 }, summaryLabel: { color: colors.muted, fontSize: 10, fontWeight: "600" }, summaryValue: { color: colors.primary, fontSize: 12, fontWeight: "700", marginTop: 3, textTransform: "capitalize" }, summaryValueReady: { color: colors.success },
  field: { gap: 5 }, label: { color: colors.text, fontSize: 12, fontWeight: "600" }, input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 46, paddingHorizontal: 12 }, multiline: { minHeight: 90, paddingVertical: 10, textAlignVertical: "top" },
  button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 46 }, disabled: { opacity: 0.45 }, buttonText: { color: "#fff", fontWeight: "700" }, muted: { color: colors.muted, lineHeight: 20 }, file: { color: colors.success, fontSize: 12, fontWeight: "600" },
  providers: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, chip: { alignItems: "center", borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, flexGrow: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: 11, paddingVertical: 7 }, active: { backgroundColor: colors.primary, borderColor: colors.primary }, chipText: { color: colors.text, fontSize: 10, fontWeight: "700" }, activeText: { color: "#fff" },
  account: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md }, accountName: { color: colors.text, fontWeight: "700" }, error: { color: colors.danger }
});
