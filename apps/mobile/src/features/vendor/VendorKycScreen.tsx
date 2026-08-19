import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { pickAndUploadDocument } from "../media/media.api";
import { getVendorWorkspace, submitVendorKyc } from "./vendor.api";

type DocumentType = "NID_FRONT" | "NID_BACK" | "TRADE_LICENSE" | "BANK_PROOF";
type Upload = { storageKey: string; checksum: string; mimeType: string };
const documentTypes: Array<[DocumentType, string, string]> = [["NID_FRONT", "NID front", "Front side of the owner's NID"], ["NID_BACK", "NID back", "Back side of the owner's NID"], ["TRADE_LICENSE", "Trade license", "Current business trade license"], ["BANK_PROOF", "Bank proof", "Cheque leaf or account statement"]];

export function VendorKycScreen() {
  const user = firebaseAuth?.currentUser ?? null;
  const cache = useQueryClient();
  const workspace = useQuery({ queryKey: ["vendor", "workspace"], queryFn: () => getVendorWorkspace(user!), enabled: Boolean(user) });
  const latest = workspace.data?.kycSubmissions[0];
  const [documents, setDocuments] = useState<Partial<Record<DocumentType, Upload>>>({});
  const [uploading, setUploading] = useState<DocumentType | null>(null);
  const upload = async (type: DocumentType) => { setUploading(type); try { const result = await pickAndUploadDocument(user!, "kyc"); if (result) setDocuments((current) => ({ ...current, [type]: result })); } finally { setUploading(null); } };
  const submit = useMutation({ mutationFn: () => submitVendorKyc(user!, { documents: Object.entries(documents).map(([documentType, item]) => ({ documentType: documentType as DocumentType, storageKey: item.storageKey, mimeType: item.mimeType, checksum: item.checksum })) }), onSuccess: () => cache.invalidateQueries({ queryKey: ["vendor", "workspace"] }) });
  const ready = Object.keys(documents).length > 0;

  return <Screen eyebrow="SELLER VERIFICATION" title="KYC verification" description="Submit private identity and business documents for marketplace approval.">
    <View style={styles.statusCard}><View style={styles.shield}><Ionicons color={colors.surface} name="shield-checkmark" size={29} /></View><View style={styles.flex}><Text style={styles.statusLabel}>CURRENT VERIFICATION STATUS</Text><Text style={styles.statusTitle}>{latest?.status || "NOT SUBMITTED"}</Text><Text style={styles.statusMeta}>{latest?.submittedAt ? `Submitted ${new Date(latest.submittedAt).toLocaleDateString("en-BD")}` : "Upload at least one valid verification document."}</Text></View></View>
    <ModuleCard title="Verification documents" meta="PDF, JPG or PNG. Files are uploaded privately and checked before review.">{documentTypes.map(([type, title, copy]) => { const file = documents[type]; return <View key={type} style={styles.document}><View style={[styles.documentIcon, file && styles.documentReady]}><Ionicons color={file ? colors.success : colors.primary} name={file ? "checkmark-circle" : "document-outline"} size={24} /></View><View style={styles.flex}><Text style={styles.documentTitle}>{title}</Text><Text style={styles.documentCopy}>{file ? file.storageKey.split("/").at(-1) : copy}</Text></View><Pressable disabled={uploading !== null} onPress={() => void upload(type)} style={styles.upload}><Text style={styles.uploadText}>{uploading === type ? "Uploading…" : file ? "Replace" : "Choose file"}</Text></Pressable></View>; })}</ModuleCard>
    <View style={styles.notice}><Ionicons color={colors.primary} name="lock-closed-outline" size={20} /><Text style={styles.noticeText}>Your evidence is stored privately and is visible only to authorized verification staff.</Text></View>
    <Pressable disabled={!ready || submit.isPending} onPress={() => submit.mutate()} style={[styles.primary, (!ready || submit.isPending) && styles.disabled]}>{submit.isPending ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>Submit documents for review</Text>}</Pressable>
    {submit.isSuccess ? <Text style={styles.success}>KYC submission sent for review.</Text> : null}{submit.error ? <Text style={styles.error}>{submit.error.message}</Text> : null}{workspace.error ? <Text style={styles.error}>{workspace.error.message}</Text> : null}
  </Screen>;
}

const styles = StyleSheet.create({ flex: { flex: 1 }, statusCard: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", gap: spacing.md, padding: spacing.xl }, shield: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, height: 58, justifyContent: "center", width: 58 }, statusLabel: { color: "#7dd3fc", fontSize: 9, fontWeight: "700", letterSpacing: 1 }, statusTitle: { color: colors.surface, fontSize: 22, fontWeight: "700", marginTop: 4 }, statusMeta: { color: "#cbd5e1", fontSize: 11, marginTop: 4 }, document: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md }, documentIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 46, justifyContent: "center", width: 46 }, documentReady: { backgroundColor: "#ecfdf5" }, documentTitle: { color: colors.text, fontWeight: "700" }, documentCopy: { color: colors.muted, fontSize: 10, marginTop: 3 }, upload: { borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 }, uploadText: { color: colors.primary, fontSize: 10, fontWeight: "700" }, notice: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.md }, noticeText: { color: colors.text, flex: 1, fontSize: 11, lineHeight: 18 }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 50 }, primaryText: { color: colors.surface, fontWeight: "700" }, disabled: { opacity: .45 }, success: { color: colors.success, fontWeight: "600", textAlign: "center" }, error: { color: colors.danger } });
