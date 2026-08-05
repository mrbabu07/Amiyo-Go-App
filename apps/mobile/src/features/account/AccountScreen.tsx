import { useQuery, useQueryClient } from "@tanstack/react-query";
import { signOut } from "firebase/auth";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { createMyAddress, getMyAddresses, updateMyProfile } from "../auth/auth.api";
import { useAuthStore } from "../auth/auth.store";
import { firebaseAuth } from "../auth/firebase";

export function AccountScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { error: sessionError, session, status, setSession } = useAuthStore();
  const [displayName, setDisplayName] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [addressBusy, setAddressBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [address, setAddress] = useState({ label: "Home", recipientName: "", phone: "", line1: "", division: "Dhaka", district: "Dhaka" });
  const user = firebaseAuth?.currentUser ?? null;
  const addresses = useQuery({
    queryKey: ["me", "addresses"],
    queryFn: () => user ? getMyAddresses(user) : Promise.resolve([]),
    enabled: Boolean(user && session)
  });

  useEffect(() => setDisplayName(session?.profile.displayName ?? ""), [session?.profile.displayName]);

  if (status === "loading") return <Centered><ActivityIndicator color={colors.primary} size="large" /><Text style={styles.muted}>Restoring your session…</Text></Centered>;
  if (!session || !user) {
    return <Centered><Text style={styles.title}>Your Amiyo-Go account</Text><Text style={styles.muted}>{sessionError || "Sign in to manage orders, addresses, and account preferences."}</Text><PrimaryButton label="Sign in or create account" onPress={() => router.replace("/auth")} /><Pressable onPress={() => router.replace("/")}><Text style={styles.link}>Continue shopping</Text></Pressable></Centered>;
  }

  async function saveProfile() {
    if (!user) return;
    setProfileBusy(true);
    setFormError(null);
    try {
      setSession(await updateMyProfile(user, { displayName: displayName.trim() || null }));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not update profile");
    } finally {
      setProfileBusy(false);
    }
  }

  async function saveAddress() {
    if (!user) return;
    setAddressBusy(true);
    setFormError(null);
    try {
      await createMyAddress(user, { ...address, isDefault: addresses.data?.length === 0 });
      await queryClient.invalidateQueries({ queryKey: ["me", "addresses"] });
      setAddressOpen(false);
      setAddress({ label: "Home", recipientName: "", phone: "", line1: "", division: "Dhaka", district: "Dhaka" });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not add address");
    } finally {
      setAddressBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.header}><Pressable onPress={() => router.replace("/")}><Text style={styles.link}>‹ Back to shop</Text></Pressable><Pressable onPress={() => firebaseAuth && signOut(firebaseAuth)}><Text style={styles.logout}>Sign out</Text></Pressable></View>
      <Pressable accessibilityRole="button" onPress={() => router.push("/returns")}><Text style={styles.link}>View returns and refund status →</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push("/account-deletion")}><Text style={styles.logout}>Privacy and account deletion →</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push("/account-data")}><Text style={styles.link}>Download my account data →</Text></Pressable>
      <View style={styles.row}><Pressable accessibilityRole="button" onPress={() => router.push("/addresses")}><Text style={styles.link}>Addresses →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/reviews")}><Text style={styles.link}>My reviews →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/support")}><Text style={styles.link}>Support →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/wishlist")}><Text style={styles.link}>Wishlist →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/alerts")}><Text style={styles.link}>Alerts →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/loyalty")}><Text style={styles.link}>Loyalty →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/messages")}><Text style={styles.link}>Messages →</Text></Pressable></View>
      <Pressable accessibilityRole="button" onPress={() => router.push("/devices")}><Text style={styles.link}>Manage connected devices →</Text></Pressable>
      <View style={styles.hero}><View style={styles.avatar}><Text style={styles.avatarText}>{(session.profile.displayName || session.email || "A").slice(0, 1).toUpperCase()}</Text></View><View style={styles.heroCopy}><Text style={styles.heroTitle}>{session.profile.displayName || "My account"}</Text><Text style={styles.heroMuted}>{session.email || session.phone}</Text><View style={styles.roles}>{session.principal.roles.map((role) => <Text key={role} style={styles.role}>{role.replaceAll("_", " ")}</Text>)}</View></View></View>
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      <View style={styles.columns}>
        <Section title="Profile">
          <Field label="Display name" onChangeText={setDisplayName} value={displayName} />
          <Text style={styles.meta}>Language: {session.profile.locale.toUpperCase()} · Currency: {session.profile.currency}</Text>
          <PrimaryButton busy={profileBusy} label="Save profile" onPress={saveProfile} />
        </Section>
        <Section action={<Pressable onPress={() => setAddressOpen(!addressOpen)}><Text style={styles.link}>{addressOpen ? "Cancel" : "+ Add address"}</Text></Pressable>} title="Delivery addresses">
          {addressOpen ? <View style={styles.addressForm}>
            <Field label="Label" onChangeText={(label) => setAddress({ ...address, label })} value={address.label} />
            <Field label="Recipient name" onChangeText={(recipientName) => setAddress({ ...address, recipientName })} value={address.recipientName} />
            <Field keyboardType="phone-pad" label="Phone" onChangeText={(phone) => setAddress({ ...address, phone })} value={address.phone} />
            <Field label="Address line" onChangeText={(line1) => setAddress({ ...address, line1 })} value={address.line1} />
            <View style={styles.row}><View style={styles.flex}><Field label="Division" onChangeText={(division) => setAddress({ ...address, division })} value={address.division} /></View><View style={styles.flex}><Field label="District" onChangeText={(district) => setAddress({ ...address, district })} value={address.district} /></View></View>
            <PrimaryButton busy={addressBusy} label="Save address" onPress={saveAddress} />
          </View> : null}
          {addresses.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
          {addresses.error ? <Text style={styles.error}>Could not load addresses.</Text> : null}
          {addresses.data?.length === 0 && !addressOpen ? <Text style={styles.muted}>No saved delivery addresses yet.</Text> : null}
          {addresses.data?.map((item) => <View key={item.id} style={styles.address}><View style={styles.addressTitle}><Text style={styles.addressLabel}>{item.label}</Text>{item.isDefault ? <Text style={styles.defaultBadge}>DEFAULT</Text> : null}</View><Text style={styles.addressName}>{item.recipientName} · {item.phone}</Text><Text style={styles.muted}>{item.line1}, {item.district}, {item.division}</Text></View>)}
        </Section>
      </View>
    </ScrollView>
  );
}

function Centered({ children }: { children: React.ReactNode }) { return <View style={styles.centered}>{children}</View>; }
function Section({ action, children, title }: { action?: React.ReactNode; children: React.ReactNode; title: string }) { return <View style={styles.section}><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action}</View>{children}</View>; }
function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) { const { label, ...inputProps } = props; return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor="#94a3b8" style={styles.input} {...inputProps} /></View>; }
function PrimaryButton({ busy, label, onPress }: { busy?: boolean; label: string; onPress(): void }) { return <Pressable disabled={busy} onPress={onPress} style={({ pressed }) => [styles.primary, (pressed || busy) && styles.pressed]}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{label}</Text>}</Pressable>; }

const styles = StyleSheet.create({
  page: { alignSelf: "center", gap: spacing.lg, maxWidth: 1000, padding: spacing.lg, width: "100%" },
  centered: { alignItems: "center", backgroundColor: colors.background, flex: 1, gap: spacing.lg, justifyContent: "center", padding: spacing.xl },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  hero: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", gap: spacing.md, padding: spacing.lg },
  heroCopy: { flex: 1 }, avatar: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.pill, height: 58, justifyContent: "center", width: 58 }, avatarText: { color: "#fff", fontSize: 24, fontWeight: "900" },
  title: { color: colors.text, fontSize: 26, fontWeight: "900", textAlign: "center" },
  heroTitle: { color: "#fff", fontSize: 26, fontWeight: "900" }, heroMuted: { color: "#cbd5e1", marginTop: 3 },
  muted: { color: colors.muted, lineHeight: 20, textAlign: "center" },
  roles: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm }, role: { backgroundColor: "rgba(255,255,255,0.14)", borderRadius: radius.pill, color: "#fff", fontSize: 9, fontWeight: "900", paddingHorizontal: 9, paddingVertical: 5 },
  columns: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg },
  section: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flex: 1, gap: spacing.md, minWidth: 300, padding: spacing.lg },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, sectionTitle: { color: colors.text, fontSize: 19, fontWeight: "900" },
  field: { gap: 6 }, label: { color: colors.text, fontSize: 12, fontWeight: "800" }, input: { backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 46, paddingHorizontal: 13 },
  primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 46, paddingHorizontal: spacing.lg }, primaryText: { color: "#fff", fontWeight: "900" }, pressed: { opacity: 0.7 },
  link: { color: colors.primary, fontWeight: "900" }, logout: { color: colors.danger, fontWeight: "900" }, error: { backgroundColor: "#fef2f2", borderRadius: radius.md, color: colors.danger, padding: spacing.md }, meta: { color: colors.muted, fontSize: 12 },
  addressForm: { gap: spacing.md }, row: { flexDirection: "row", gap: spacing.sm }, flex: { flex: 1 }, address: { borderTopColor: colors.border, borderTopWidth: 1, gap: 4, paddingTop: spacing.md }, addressTitle: { alignItems: "center", flexDirection: "row", gap: spacing.sm }, addressLabel: { color: colors.text, fontWeight: "900" }, addressName: { color: colors.text, fontSize: 13 }, defaultBadge: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, color: colors.primary, fontSize: 8, fontWeight: "900", paddingHorizontal: 7, paddingVertical: 3 }
});
