import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { createAdminPickupPoint, getAdminDeliverySettings, getAdminPickupPoints, updateAdminDeliverySettings, updateAdminPickupPoint } from "../operations/delivery-settings.api";

type Form = {
  standard: string; threshold: string; free: boolean;
  division: string; district: string; upazila: string; union: string;
  sameUnion: string; sameUpazila: string; sameDistrict: string; outside: string;
  sameUnionEnabled: boolean; sameUpazilaEnabled: boolean; sameDistrictEnabled: boolean; outsideEnabled: boolean;
  openBoxAllowed: boolean; inspectionMinutes: string;
  minDays: string; maxDays: string;
};

const empty: Form = {
  standard: "", threshold: "", free: true, division: "", district: "", upazila: "", union: "",
  sameUnion: "", sameUpazila: "", sameDistrict: "", outside: "",
  sameUnionEnabled: true, sameUpazilaEnabled: true, sameDistrictEnabled: true, outsideEnabled: true, openBoxAllowed: false, inspectionMinutes: "5",
  minDays: "2", maxDays: "5"
};

export function AdminDeliverySettingsScreen() {
  const user = useCurrentUser();
  const userId = user?.uid ?? null;
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "delivery-settings", userId], queryFn: () => getAdminDeliverySettings(user!), enabled: Boolean(user), retry: false });
  const [form, setForm] = useState(empty);

  useEffect(() => {
    const data = query.data;
    if (!data) return;
    setForm({
      standard: data.standardChargeMinor, threshold: data.freeDeliveryThresholdMinor, free: data.freeDeliveryEnabled,
      division: data.baseLocation.division, district: data.baseLocation.district, upazila: data.baseLocation.upazila, union: data.baseLocation.union,
      sameUnion: data.zoneFees.sameUnionMinor, sameUpazila: data.zoneFees.sameUpazilaMinor, sameDistrict: data.zoneFees.sameDistrictMinor, outside: data.zoneFees.outsideDistrictMinor,
      sameUnionEnabled: data.serviceableZones.sameUnion, sameUpazilaEnabled: data.serviceableZones.sameUpazila,
      sameDistrictEnabled: data.serviceableZones.sameDistrict, outsideEnabled: data.serviceableZones.outsideDistrict,
      openBoxAllowed: data.inspectionPolicy.openBoxAllowed, inspectionMinutes: String(data.inspectionPolicy.inspectionMinutes || 5),
      minDays: String(data.estimatedDays.min), maxDays: String(data.estimatedDays.max)
    });
  }, [query.data]);

  const currentActor = () => {
    if (!user || user.uid !== userId) throw new Error("Account changed. Reopen delivery settings.");
    return user;
  };
  const save = useMutation({
    mutationFn: () => updateAdminDeliverySettings(currentActor(), {
      standardChargeMinor: form.standard, freeDeliveryEnabled: form.free, freeDeliveryThresholdMinor: form.threshold,
      baseLocation: { division: form.division, district: form.district, upazila: form.upazila, union: form.union },
      zoneFees: { sameUnionMinor: form.sameUnion, sameUpazilaMinor: form.sameUpazila, sameDistrictMinor: form.sameDistrict, outsideDistrictMinor: form.outside },
      serviceableZones: { sameUnion: form.sameUnionEnabled, sameUpazila: form.sameUpazilaEnabled, sameDistrict: form.sameDistrictEnabled, outsideDistrict: form.outsideEnabled },
      inspectionPolicy: { openBoxAllowed: form.openBoxAllowed, inspectionMinutes: form.openBoxAllowed ? Number(form.inspectionMinutes) : 0 },
      estimatedDays: { min: Number(form.minDays), max: Number(form.maxDays) }, expectedVersion: query.data!.version
    }),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["admin", "delivery-settings", userId] })
  });

  if (query.isLoading) return <Screen title="Delivery settings"><ActivityIndicator color={colors.primary} /></Screen>;
  return <Screen eyebrow="ADMIN LOGISTICS" title="Delivery settings" description="Manually control delivery coverage, zone charges and customer estimates for your operating area.">
    {query.error || save.error ? <Text style={styles.error}>{(query.error || save.error)?.message}</Text> : null}
    <ModuleCard title="Free delivery">
      <Toggle label="Enable free delivery" onChange={(free) => setForm({ ...form, free })} value={form.free} />
      <Field label="Threshold (minor units; 100 = ৳1)" value={form.threshold} onChangeText={(threshold) => setForm({ ...form, threshold })} />
      <Field label="Standard charge" value={form.standard} onChangeText={(standard) => setForm({ ...form, standard })} />
    </ModuleCard>
    <ModuleCard title="Main service area" meta="This location is used to classify every customer address.">
      <Fields form={form} setForm={setForm} names={[["division", "Division"], ["district", "District"], ["upazila", "Upazila"], ["union", "Union"]]} />
    </ModuleCard>
    <ModuleCard title="Manual service coverage" meta="Turn off a zone when your local delivery team cannot serve it. Disabled zones cannot receive a delivery quote.">
      <Toggle label="Serve the same union" onChange={(sameUnionEnabled) => setForm({ ...form, sameUnionEnabled })} value={form.sameUnionEnabled} />
      <Toggle label="Serve the same upazila" onChange={(sameUpazilaEnabled) => setForm({ ...form, sameUpazilaEnabled })} value={form.sameUpazilaEnabled} />
      <Toggle label="Serve the same district" onChange={(sameDistrictEnabled) => setForm({ ...form, sameDistrictEnabled })} value={form.sameDistrictEnabled} />
      <Toggle label="Serve outside the district" onChange={(outsideEnabled) => setForm({ ...form, outsideEnabled })} value={form.outsideEnabled} />
    </ModuleCard>
    <ModuleCard title="Zone fees">
      <Fields form={form} setForm={setForm} names={[["sameUnion", "Same union"], ["sameUpazila", "Same upazila"], ["sameDistrict", "Same district"], ["outside", "Outside district"]]} />
      <View style={styles.row}><Field label="Minimum days" value={form.minDays} onChangeText={(minDays) => setForm({ ...form, minDays })} /><Field label="Maximum days" value={form.maxDays} onChangeText={(maxDays) => setForm({ ...form, maxDays })} /></View>
    </ModuleCard>
    <ModuleCard title="Delivery inspection" meta="Choose whether customers may inspect products before accepting a manually delivered parcel.">
      <Toggle label="Allow open-box delivery" onChange={(openBoxAllowed) => setForm({ ...form, openBoxAllowed })} value={form.openBoxAllowed} />
      {form.openBoxAllowed ? <Field label="Inspection window (minutes)" value={form.inspectionMinutes} onChangeText={(inspectionMinutes) => setForm({ ...form, inspectionMinutes })} /> : <Text style={styles.hint}>Closed-box delivery: customers should accept the sealed parcel and use the return workflow for eligible issues.</Text>}
    </ModuleCard>
    <PickupPointsManager />
    <Pressable accessibilityRole="button" disabled={save.isPending || !query.data} onPress={() => save.mutate()} style={[styles.button, (save.isPending || !query.data) && styles.disabled]}><Text style={styles.buttonText}>{save.isPending ? "Saving…" : "Save delivery settings"}</Text></Pressable>
  </Screen>;
}

const emptyPoint = { name: "", phone: "", address: "", division: "", district: "", upazila: "", unionName: "", instructions: "", active: true };
function PickupPointsManager() {
  const user = useCurrentUser();
  const userId = user?.uid ?? null;
  const cache = useQueryClient();
  const [draft, setDraft] = useState(emptyPoint);
  const points = useQuery({ queryKey: ["admin", "pickup-points", userId], queryFn: () => getAdminPickupPoints(user!), enabled: Boolean(user), retry: false });
  const refresh = () => cache.invalidateQueries({ queryKey: ["admin", "pickup-points", userId] });
  const create = useMutation({ mutationFn: () => { if (!user) throw new Error("Sign in again"); return createAdminPickupPoint(user, { ...draft, instructions: draft.instructions.trim() || null }); }, onSuccess: async () => { setDraft(emptyPoint); await refresh(); } });
  const toggle = useMutation({ mutationFn: (point: NonNullable<typeof points.data>[number]) => { if (!user) throw new Error("Sign in again"); return updateAdminPickupPoint(user, point.id, { name: point.name, phone: point.phone, address: point.address, division: point.division, district: point.district, upazila: point.upazila, unionName: point.unionName, instructions: point.instructions, active: !point.active, expectedVersion: point.version }); }, onSuccess: refresh });
  const valid = [draft.name, draft.phone, draft.address, draft.division, draft.district, draft.upazila, draft.unionName].every((value) => value.trim().length >= 2);
  return <ModuleCard title="Customer pickup points" meta="Prepare trusted local collection counters now; customer checkout stays disabled until the complete pickup handoff flow is enabled.">
    <View style={styles.grid}>{(["name", "phone", "address", "division", "district", "upazila", "unionName"] as const).map((name) => <Field key={name} label={name === "unionName" ? "Union" : name[0]!.toUpperCase() + name.slice(1)} value={draft[name]} onChangeText={(value) => setDraft({ ...draft, [name]: value })} />)}</View>
    <Field label="Pickup instructions" value={draft.instructions} onChangeText={(instructions) => setDraft({ ...draft, instructions })} />
    <Pressable accessibilityRole="button" disabled={!valid || create.isPending} onPress={() => create.mutate()} style={[styles.button, (!valid || create.isPending) && styles.disabled]}><Text style={styles.buttonText}>{create.isPending ? "Adding…" : "Add pickup point"}</Text></Pressable>
    {points.isLoading ? <ActivityIndicator color={colors.primary} /> : null}{points.error || create.error || toggle.error ? <Text style={styles.error}>{(points.error || create.error || toggle.error)?.message}</Text> : null}
    <View style={styles.pointList}>{points.data?.map((point) => <View key={point.id} style={styles.pointCard}><View style={styles.pointCopy}><Text style={styles.pointTitle}>{point.name}</Text><Text style={styles.hint}>{point.address}, {point.unionName}, {point.upazila}, {point.district}</Text><Text style={styles.hint}>{point.phone}{point.instructions ? ` · ${point.instructions}` : ""}</Text></View><Pressable accessibilityRole="button" disabled={toggle.isPending} onPress={() => toggle.mutate(point)} style={[styles.pointToggle, point.active && styles.pointToggleActive]}><Text style={[styles.pointToggleText, point.active && styles.pointToggleTextActive]}>{point.active ? "Active" : "Inactive"}</Text></Pressable></View>)}</View>
  </ModuleCard>;
}

function Toggle({ label, onChange, value }: { label: string; onChange(value: boolean): void; value: boolean }) {
  return <View style={styles.switchRow}><Text style={styles.label}>{label}</Text><Switch accessibilityLabel={label} onValueChange={onChange} value={value} /></View>;
}
function Fields({ form, setForm, names }: { form: Form; setForm(value: Form): void; names: Array<[keyof Form, string]> }) {
  return <View style={styles.grid}>{names.map(([name, label]) => <Field key={name} label={label} value={String(form[name])} onChangeText={(value) => setForm({ ...form, [name]: value })} />)}</View>;
}
function Field({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) {
  const textField = ["Division", "District", "Upazila", "Union"].some((value) => label.includes(value));
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput keyboardType={textField ? "default" : "numeric"} placeholderTextColor={colors.muted} style={styles.input} {...props} /></View>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, field: { flex: 1, minWidth: 180 },
  label: { color: colors.text, flex: 1, fontSize: 12, fontWeight: "600", marginBottom: spacing.xs }, input: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, padding: spacing.md },
  switchRow: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", minHeight: 50 },
  button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, padding: 15 }, disabled: { opacity: 0.55 }, buttonText: { color: colors.onPrimary, fontWeight: "700" }, hint: { color: colors.muted, lineHeight: 20 }, pointList: { gap: spacing.sm }, pointCard: { alignItems: "center", backgroundColor: colors.background, borderRadius: radius.md, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, padding: spacing.md }, pointCopy: { flex: 1, minWidth: 220 }, pointTitle: { color: colors.text, fontWeight: "700" }, pointToggle: { borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 }, pointToggleActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent }, pointToggleText: { color: colors.muted, fontWeight: "700" }, pointToggleTextActive: { color: colors.accent }, error: { color: colors.danger }
});
