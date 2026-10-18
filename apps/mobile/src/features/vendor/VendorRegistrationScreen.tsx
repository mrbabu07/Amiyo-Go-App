import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import type { User } from "firebase/auth";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { createSession } from "../auth/auth.api";
import { useAuthStore } from "../auth/auth.store";
import { useCurrentUser } from "../auth/use-current-user";
import { getCategories } from "../catalog/catalog.api";
import { LocationSelect } from "./components/LocationSelect";
import { VendorCategorySelector } from "./components/VendorCategorySelector";
import { districts, divisions, locationName, unions, upazilas } from "./data/locations";
import { registerVendor } from "./vendor.api";

const initial = {
  shopName: "",
  phone: "",
  divisionId: "",
  districtId: "",
  upazilaId: "",
  unionId: "",
  details: ""
};

export function VendorRegistrationScreen() {
  const router = useRouter();
  const user = useCurrentUser();
  const compact = useWindowDimensions().width < 620;
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;
  const session = useAuthStore((state) => state.session);
  const setSession = useAuthStore((state) => state.setSession);
  const categories = useQuery({ queryKey: ["catalog", "categories"], queryFn: getCategories });
  const [form, setForm] = useState(initial);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => { setForm(initial); setCategoryIds([]); setAccepted(false); }, [user?.uid]);

  const districtOptions = useMemo(() => districts.filter((item) => item.parentId === form.divisionId), [form.divisionId]);
  const upazilaOptions = useMemo(() => upazilas.filter((item) => item.parentId === form.districtId), [form.districtId]);
  const unionOptions = useMemo(() => unions.filter((item) => item.parentId === form.upazilaId), [form.upazilaId]);
  const valid = form.shopName.trim().length >= 3
    && form.phone.trim().length >= 8
    && Boolean(form.divisionId && form.districtId && form.upazilaId)
    && categoryIds.length > 0
    && accepted;

  const submit = useMutation({
    retry: false,
    mutationFn: (owner: User) => registerVendor(owner, {
      legalName: form.shopName,
      displayName: form.shopName,
      phone: form.phone,
      description: null,
      address: {
        line1: form.details.trim() || `${locationName(upazilas, form.upazilaId)}, ${locationName(districts, form.districtId)}`,
        division: locationName(divisions, form.divisionId),
        district: locationName(districts, form.districtId),
        upazila: locationName(upazilas, form.upazilaId),
        unionName: locationName(unions, form.unionId) || null
      },
      categoryIds,
      acceptedTerms: true,
      termsVersion: "2026.06",
      privacyVersion: "2026.06"
    }),
    onSuccess: async (_data, owner) => {
      if (activeUid.current !== owner.uid) return;
      setSession(await createSession(owner));
      if (activeUid.current !== owner.uid) return;
      router.replace("/vendor/settings");
    }
  });

  if (!user) {
    return <Screen title="Become a Vendor" description="Sign in or create an account before submitting a vendor registration."><Action label="Sign in" onPress={() => router.push("/auth")} /></Screen>;
  }

  if (session?.vendorMemberships.length) {
    return <Screen title="Seller workspace already connected" description="This account already belongs to a seller workspace."><Action label="Open seller dashboard" onPress={() => router.replace("/vendor/dashboard")} /></Screen>;
  }

  return (
    <Screen eyebrow="SELL ON AMIYO-GO" title="Become a Vendor" description="Open your shop and reach customers across Bangladesh.">
      <View style={[styles.steps, compact && styles.stepsCompact]}>
        <Step active icon="storefront-outline" label="Shop" />
        <Step active={Boolean(form.upazilaId)} icon="location-outline" label="Location" />
        <Step active={categoryIds.length > 0} icon="grid-outline" label="Categories" />
        <Step active={accepted} icon="checkmark-circle-outline" label="Review" />
      </View>
      <ModuleCard title="Vendor Registration" meta="Complete the information below to submit your shop for approval.">
        <Field label="Shop Name *" onChangeText={(shopName) => setForm({ ...form, shopName })} placeholder="Enter your shop name" value={form.shopName} />
        <Field keyboardType="phone-pad" label="Phone Number *" onChangeText={(phone) => setForm({ ...form, phone })} placeholder="01XXXXXXXXX" value={form.phone} />

        <View style={styles.sectionHeading}>
          <View style={styles.sectionIcon}><Ionicons color={colors.primary} name="location-outline" size={20} /></View>
          <View>
            <Text style={styles.sectionTitle}>Shop Address</Text>
            <Text style={styles.sectionMeta}>Choose your business pickup location.</Text>
          </View>
        </View>

        <View style={[styles.columns, compact && styles.columnsCompact]}>
          <View style={[styles.flex, compact && styles.flexCompact]}>
            <LocationSelect
              label="Division"
              onChange={(divisionId) => setForm({ ...form, divisionId, districtId: "", upazilaId: "", unionId: "" })}
              options={divisions}
              placeholder="Select Division"
              required
              value={form.divisionId}
            />
          </View>
          <View style={[styles.flex, compact && styles.flexCompact]}>
            <LocationSelect
              disabled={!form.divisionId}
              label="District"
              onChange={(districtId) => setForm({ ...form, districtId, upazilaId: "", unionId: "" })}
              options={districtOptions}
              placeholder="Select District"
              required
              value={form.districtId}
            />
          </View>
        </View>
        <View style={[styles.columns, compact && styles.columnsCompact]}>
          <View style={[styles.flex, compact && styles.flexCompact]}>
            <LocationSelect
              disabled={!form.districtId}
              label="Upazila"
              onChange={(upazilaId) => setForm({ ...form, upazilaId, unionId: "" })}
              options={upazilaOptions}
              placeholder="Select Upazila"
              required
              value={form.upazilaId}
            />
          </View>
          <View style={[styles.flex, compact && styles.flexCompact]}>
            <LocationSelect
              disabled={!form.upazilaId}
              label="Union (Optional)"
              onChange={(unionId) => setForm({ ...form, unionId })}
              options={unionOptions}
              placeholder="Select Union"
              value={form.unionId}
            />
          </View>
        </View>
        <Field
          label="Detailed Address"
          multiline
          onChangeText={(details) => setForm({ ...form, details })}
          placeholder="House/Building number, Road, Area"
          value={form.details}
        />
      </ModuleCard>

      <ModuleCard title="Product Categories" meta="Select the categories you will sell in.">
        {categories.isLoading ? <ActivityIndicator color={colors.primary} /> : <VendorCategorySelector categories={categories.data ?? []} onChange={setCategoryIds} selectedIds={categoryIds} />}
        {categories.error ? <Text style={styles.error}>Could not load categories.</Text> : null}
      </ModuleCard>

      <Pressable onPress={() => setAccepted((value) => !value)} style={styles.consent}>
        <Ionicons color={accepted ? colors.primary : colors.muted} name={accepted ? "checkbox" : "square-outline"} size={22} />
        <Text style={styles.consentText}>I agree to the Amiyo-Go Terms and Conditions, vendor rules, category policy, payout rules, and Privacy Policy.</Text>
      </Pressable>
      {submit.error ? <Text style={styles.submitError}>{submit.error.message}</Text> : null}
      <Action busy={submit.isPending} disabled={!user || !valid} label="Register as Vendor" onPress={() => user && submit.mutate(user)} />
    </Screen>
  );
}

function Step({ active, icon, label }: { active?: boolean; icon: React.ComponentProps<typeof Ionicons>["name"]; label: string }) {
  return <View style={[styles.step, active && styles.stepActive]}><Ionicons color={active ? colors.surface : colors.muted} name={icon} size={17} /><Text style={[styles.stepText, active && styles.stepTextActive]}>{label}</Text></View>;
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...input } = props;
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor={colors.muted} style={[styles.input, input.multiline && styles.multiline]} {...input} /></View>;
}

function Action({ busy, disabled, label, onPress }: { busy?: boolean; disabled?: boolean; label: string; onPress(): void }) {
  return <Pressable disabled={busy || disabled} onPress={onPress} style={[styles.action, (busy || disabled) && styles.disabled]}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionText}>{label}</Text>}</Pressable>;
}

const styles = StyleSheet.create({
  steps: { backgroundColor: colors.surface, borderRadius: radius.lg, flexDirection: "row", gap: spacing.sm, padding: spacing.sm },
  stepsCompact: { flexWrap: "wrap" },
  step: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.pill, flex: 1, flexDirection: "row", gap: 6, justifyContent: "center", minHeight: 40, minWidth: 110, paddingHorizontal: spacing.sm },
  stepActive: { backgroundColor: colors.primary },
  stepText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  stepTextActive: { color: colors.surface },
  field: { gap: 6 },
  label: { color: colors.text, fontSize: 13, fontWeight: "700" },
  input: { backgroundColor: colors.surface, borderColor: "#d1d5db", borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 48, paddingHorizontal: 14 },
  multiline: { minHeight: 94, paddingVertical: 12, textAlignVertical: "top" },
  sectionHeading: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs, paddingTop: spacing.md },
  sectionIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 40, justifyContent: "center", width: 40 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "700" },
  sectionMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  columns: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  columnsCompact: { flexDirection: "column" },
  flex: { flex: 1, minWidth: 220 },
  flexCompact: { minWidth: 0, width: "100%" },
  consent: { alignItems: "flex-start", backgroundColor: colors.primarySoft, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  consentText: { color: colors.text, flex: 1, fontSize: 13, lineHeight: 21 },
  action: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 50 },
  actionText: { color: colors.surface, fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  error: { color: colors.danger },
  submitError: { backgroundColor: colors.primarySoft, borderColor: colors.danger, borderRadius: radius.md, borderWidth: 1, color: colors.danger, padding: spacing.md }
});
