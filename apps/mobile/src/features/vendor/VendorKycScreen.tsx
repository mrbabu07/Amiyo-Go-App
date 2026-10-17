import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { pickAndUploadDocument, waitForMediaUploadReady } from "../media/media.api";
import { getVendorWorkspace, submitVendorKyc } from "./vendor.api";

type DocumentType = "NID_FRONT" | "NID_BACK" | "TRADE_LICENSE" | "BANK_PROOF";
type Upload = { storageKey: string; checksum: string; mimeType: string; originalName: string };
const documentTypes: Array<[DocumentType, string, string]> = [["NID_FRONT", "NID front", "Front side of the owner's NID"], ["NID_BACK", "NID back", "Back side of the owner's NID"], ["TRADE_LICENSE", "Trade license", "Current business trade license"], ["BANK_PROOF", "Bank proof", "Cheque leaf or account statement"]];

export function VendorKycScreen() {
  const compact = useWindowDimensions().width < 620;
  const user = useCurrentUser();
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;
  const cache = useQueryClient();
  const workspace = useQuery({ queryKey: ["vendor", "workspace", user?.uid], queryFn: () => getVendorWorkspace(user!), enabled: Boolean(user), retry: false });
  const latest = workspace.data?.kycSubmissions[0];
  const [documents, setDocuments] = useState<Partial<Record<DocumentType, Upload>>>({});
  const [uploading, setUploading] = useState<DocumentType | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  useEffect(() => { setDocuments({}); setUploading(null); setUploadError(null); }, [user?.uid]);
  const upload = async (type: DocumentType) => {
    if (!user || uploading) return;
    const owner = user;
    setUploading(type);
    setUploadError(null);
    try {
      const result = await pickAndUploadDocument(owner, "kyc");
      if (result) await waitForMediaUploadReady(owner, result.id);
      if (result && activeUid.current === owner.uid) setDocuments((current) => ({ ...current, [type]: result }));
    } catch (error) {
      if (activeUid.current === owner.uid) setUploadError(error instanceof Error ? error.message : "Could not upload this document");
    } finally {
      if (activeUid.current === owner.uid) setUploading(null);
    }
  };
  const submit = useMutation({
    retry: false,
    mutationFn: ({ owner, files }: { owner: User; files: Partial<Record<DocumentType, Upload>> }) => submitVendorKyc(owner, { documents: Object.entries(files).map(([documentType, item]) => ({ documentType: documentType as DocumentType, storageKey: item.storageKey, mimeType: item.mimeType, checksum: item.checksum })) }),
    onSuccess: async (_data, variables) => {
      if (activeUid.current === variables.owner.uid) setDocuments({});
      await cache.invalidateQueries({ queryKey: ["vendor", "workspace", variables.owner.uid] });
    }
  });
  const ready = Object.keys(documents).length > 0;

  return <Screen eyebrow="SELLER VERIFICATION" title="KYC verification" description="Submit private identity and business documents for marketplace approval.">
    <View style={[styles.statusCard, compact && compactStyles.statusCard]}><View style={styles.shield}><Ionicons color={colors.surface} name="shield-checkmark" size={29} /></View><View style={styles.flex}><Text style={styles.statusLabel}>CURRENT VERIFICATION STATUS</Text><Text style={styles.statusTitle}>{latest?.status || "NOT SUBMITTED"}</Text><Text style={styles.statusMeta}>{latest?.submittedAt ? `Submitted ${new Date(latest.submittedAt).toLocaleDateString("en-BD")}` : "Upload at least one valid verification document."}</Text></View></View>
    <ModuleCard title="Verification documents" meta="PDF, JPG or PNG. Files are uploaded privately and checked before review.">{documentTypes.map(([type, title, copy]) => { const file = documents[type]; return <View key={type} style={[styles.document, compact && compactStyles.document]}><View style={[styles.documentIcon, file && styles.documentReady]}><Ionicons color={file ? colors.success : colors.primary} name={file ? "checkmark-circle" : "document-outline"} size={24} /></View><View style={styles.flex}><Text style={styles.documentTitle}>{title}</Text><Text numberOfLines={compact ? 2 : 1} style={styles.documentCopy}>{file ? file.originalName : copy}</Text></View><Pressable accessibilityLabel={`${file ? "Replace" : "Choose"} ${title}`} accessibilityRole="button" disabled={!user || uploading !== null || submit.isPending} onPress={() => void upload(type)} style={[styles.upload, compact && compactStyles.upload, (!user || uploading !== null || submit.isPending) && styles.disabled]}>{uploading === type ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.uploadText}>{file ? "Replace" : "Choose file"}</Text>}</Pressable></View>; })}</ModuleCard>
    {uploadError ? <Text accessibilityRole="alert" style={styles.error}>{uploadError}</Text> : null}
    <View style={styles.notice}><Ionicons color={colors.primary} name="lock-closed-outline" size={20} /><Text style={styles.noticeText}>Your evidence is stored privately and is visible only to authorized verification staff.</Text></View>
    <Pressable accessibilityRole="button" disabled={!user || !ready || uploading !== null || submit.isPending} onPress={() => submit.mutate({ owner: user!, files: documents })} style={[styles.primary, (!user || !ready || uploading !== null || submit.isPending) && styles.disabled]}>{submit.isPending ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>Submit documents for review</Text>}</Pressable>
    {submit.isSuccess ? <Text style={styles.success}>KYC submission sent for review.</Text> : null}{submit.error ? <Text accessibilityRole="alert" style={styles.error}>{submit.error.message}</Text> : null}{workspace.error ? <Text accessibilityRole="alert" style={styles.error}>{workspace.error.message}</Text> : null}
  </Screen>;
}

const compactStyles = StyleSheet.create({
  statusCard: { alignItems: "flex-start", padding: spacing.lg },
  document: { alignItems: "stretch", flexWrap: "wrap" },
  upload: { width: "100%" }
});

const styles = StyleSheet.create({ flex: { flex: 1 }, statusCard: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", gap: spacing.md, padding: spacing.xl }, shield: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, height: 58, justifyContent: "center", width: 58 }, statusLabel: { color: "#7dd3fc", fontSize: 9, fontWeight: "700", letterSpacing: 1 }, statusTitle: { color: colors.surface, fontSize: 22, fontWeight: "700", marginTop: 4 }, statusMeta: { color: "#cbd5e1", fontSize: 11, marginTop: 4 }, document: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md }, documentIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 46, justifyContent: "center", width: 46 }, documentReady: { backgroundColor: "#ecfdf5" }, documentTitle: { color: colors.text, fontWeight: "700" }, documentCopy: { color: colors.muted, fontSize: 10, marginTop: 3 }, upload: { alignItems: "center", borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, justifyContent: "center", minHeight: 40, minWidth: 92, paddingHorizontal: 12, paddingVertical: 9 }, uploadText: { color: colors.primary, fontSize: 10, fontWeight: "700" }, notice: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.md }, noticeText: { color: colors.text, flex: 1, fontSize: 11, lineHeight: 18 }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 50 }, primaryText: { color: colors.surface, fontWeight: "700" }, disabled: { opacity: .45 }, success: { color: colors.success, fontWeight: "600", textAlign: "center" }, error: { color: colors.danger } });
