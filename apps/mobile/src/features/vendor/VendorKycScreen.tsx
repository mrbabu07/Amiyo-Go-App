import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
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
  const locked = Boolean(latest && ["SUBMITTED", "REVIEWING", "APPROVED"].includes(latest.status));
  const uploadedCount = Object.keys(documents).length;
  const evidenceProgress = Math.round((uploadedCount / documentTypes.length) * 100);
  useEffect(() => { setDocuments({}); setUploading(null); setUploadError(null); }, [user?.uid]);
  const upload = async (type: DocumentType) => {
    if (!user || uploading || locked) return;
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
  const ready = uploadedCount > 0;

  return <Screen eyebrow="SELLER VERIFICATION" title="KYC verification" description="Submit private identity and business documents for marketplace approval.">
    <View style={[styles.statusCard, compact && compactStyles.statusCard]}><View style={styles.shield}><Ionicons color={colors.surface} name="shield-checkmark" size={29} /></View><View style={styles.flex}><Text style={styles.statusLabel}>CURRENT VERIFICATION STATUS</Text><Text style={styles.statusTitle}>{latest?.status || "NOT SUBMITTED"}</Text><Text style={styles.statusMeta}>{latest?.submittedAt ? `Submitted ${new Date(latest.submittedAt).toLocaleDateString("en-BD")}` : "Upload at least one valid verification document."}</Text></View><Text style={[styles.statusBadge, latest?.status === "APPROVED" && styles.statusApproved, latest?.status === "REJECTED" && styles.statusRejected]}>{latest?.status === "APPROVED" ? "VERIFIED" : locked ? "LOCKED" : "ACTIONABLE"}</Text></View>
    {latest?.rejectionReason ? <View accessibilityRole="alert" style={styles.rejection}><Ionicons color={colors.danger} name="alert-circle-outline" size={21} /><View style={styles.flex}><Text style={styles.rejectionTitle}>Verification needs changes</Text><Text style={styles.rejectionCopy}>{latest.rejectionReason}</Text></View></View> : null}
    <View style={[styles.progressCard, compact && styles.progressCardCompact]}><View style={styles.progressCopy}><Text style={styles.progressEyebrow}>NEW SUBMISSION EVIDENCE</Text><Text accessibilityRole="header" style={styles.progressTitle}>{uploadedCount} of {documentTypes.length} documents selected</Text><Text style={styles.progressMeta}>{ready ? "You can submit now, or add more evidence to help the review team." : locked ? "This submission is locked while verification is in progress." : "At least one valid document is required. More evidence can reduce follow-up requests."}</Text><View style={styles.track}><View style={[styles.fill, { width: `${evidenceProgress}%` }]} /></View></View><View style={styles.reviewSteps}><ReviewStep active label="Upload" /><ReviewStep active={Boolean(latest)} label="Submitted" /><ReviewStep active={latest?.status === "REVIEWING" || latest?.status === "APPROVED"} label="Review" /><ReviewStep active={latest?.status === "APPROVED"} label="Approved" /></View></View>
    <ModuleCard title="Verification documents" meta={locked ? "Documents cannot be replaced while this submission is under review." : "PDF, JPG or PNG. Files are uploaded privately and checked before review."}>{documentTypes.map(([type, title, copy]) => { const file = documents[type]; return <View key={type} style={[styles.document, compact && compactStyles.document]}><View style={[styles.documentIcon, file && styles.documentReady]}><Ionicons color={file ? colors.success : colors.primary} name={file ? "checkmark-circle" : "document-outline"} size={24} /></View><View style={styles.flex}><Text style={styles.documentTitle}>{title}</Text><Text numberOfLines={compact ? 2 : 1} style={styles.documentCopy}>{file ? file.originalName : copy}</Text></View><Pressable accessibilityLabel={`${file ? "Replace" : "Choose"} ${title}`} accessibilityRole="button" disabled={!user || locked || uploading !== null || submit.isPending} onPress={() => void upload(type)} style={[styles.upload, compact && compactStyles.upload, (!user || locked || uploading !== null || submit.isPending) && styles.disabled]}>{uploading === type ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.uploadText}>{locked ? "Reviewing" : file ? "Replace" : "Choose file"}</Text>}</Pressable></View>; })}</ModuleCard>
    {uploadError ? <Text accessibilityRole="alert" style={styles.error}>{uploadError}</Text> : null}
    <View style={styles.notice}><Ionicons color={colors.primary} name="lock-closed-outline" size={20} /><Text style={styles.noticeText}>Your evidence is stored privately and is visible only to authorized verification staff.</Text></View>
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !user || locked || !ready || uploading !== null || submit.isPending }} disabled={!user || locked || !ready || uploading !== null || submit.isPending} onPress={() => submit.mutate({ owner: user!, files: documents })} style={[styles.primary, (!user || locked || !ready || uploading !== null || submit.isPending) && styles.disabled]}>{submit.isPending ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>{latest?.status === "APPROVED" ? "Verification approved" : locked ? "Review in progress" : latest?.status === "REJECTED" ? "Resubmit documents" : "Submit documents for review"}</Text>}</Pressable>
    {submit.isSuccess ? <View style={styles.nextStep}><View style={styles.flex}><Text style={styles.success}>KYC submission sent for review.</Text><Text style={styles.nextStepCopy}>Add a bank or mobile wallet destination now so payouts are ready after approval.</Text></View><Pressable accessibilityRole="button" onPress={() => router.push("/vendor/payout-settings")} style={[styles.nextStepButton, compact && compactStyles.nextStepButton]}><Text style={styles.nextStepButtonText}>Continue to payout setup</Text><Ionicons color={colors.surface} name="arrow-forward" size={17} /></Pressable></View> : null}{submit.error ? <Text accessibilityRole="alert" style={styles.error}>{submit.error.message}</Text> : null}{workspace.error ? <Text accessibilityRole="alert" style={styles.error}>{workspace.error.message}</Text> : null}
  </Screen>;
}

function ReviewStep({ active, label }: { active: boolean; label: string }) { return <View style={styles.reviewStep}><View style={[styles.reviewDot, active && styles.reviewDotActive]}>{active ? <Ionicons color={colors.surface} name="checkmark" size={11} /> : null}</View><Text style={[styles.reviewLabel, active && styles.reviewLabelActive]}>{label}</Text></View>; }

const compactStyles = StyleSheet.create({
  statusCard: { alignItems: "flex-start", padding: spacing.lg },
  document: { alignItems: "stretch", flexWrap: "wrap" },
  upload: { width: "100%" },
  nextStepButton: { width: "100%" }
});

const styles = StyleSheet.create({ flex: { flex: 1 }, statusCard: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", flexWrap: "wrap", gap: spacing.md, padding: spacing.xl }, shield: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, height: 58, justifyContent: "center", width: 58 }, statusLabel: { color: colors.accent, fontSize: 9, fontWeight: "700", letterSpacing: 1 }, statusTitle: { color: colors.surface, fontSize: 22, fontWeight: "700", marginTop: 4 }, statusMeta: { color: colors.border, fontSize: 11, marginTop: 4 }, statusBadge: { backgroundColor: "rgba(255,255,255,.1)", borderRadius: radius.pill, color: colors.surface, fontSize: 8, fontWeight: "700", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 6 }, statusApproved: { backgroundColor: colors.accent, color: colors.navy }, statusRejected: { backgroundColor: colors.danger }, rejection: { alignItems: "flex-start", backgroundColor: "#FCE8E6", borderRadius: radius.lg, flexDirection: "row", gap: spacing.sm, padding: spacing.md }, rejectionTitle: { color: colors.danger, fontSize: 13, fontWeight: "700" }, rejectionCopy: { color: colors.text, fontSize: 11, lineHeight: 18, marginTop: 3 }, progressCard: { alignItems: "stretch", backgroundColor: colors.surface, borderRadius: radius.xl, boxShadow: "0 9px 26px rgba(11,31,58,.07)", flexDirection: "row", gap: spacing.xl, padding: spacing.lg }, progressCardCompact: { flexDirection: "column", gap: spacing.md }, progressCopy: { flex: 1, minWidth: 0 }, progressEyebrow: { color: colors.accent, fontSize: 9, fontWeight: "700", letterSpacing: 1 }, progressTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 5 }, progressMeta: { color: colors.muted, fontSize: 10, lineHeight: 17, marginTop: 4 }, track: { backgroundColor: colors.border, borderRadius: radius.pill, height: 7, marginTop: spacing.md, overflow: "hidden" }, fill: { backgroundColor: colors.primary, borderRadius: radius.pill, height: 7 }, reviewSteps: { alignItems: "flex-start", flex: 1, flexDirection: "row", justifyContent: "space-between", minWidth: 280 }, reviewStep: { alignItems: "center", flex: 1, gap: 6 }, reviewDot: { alignItems: "center", backgroundColor: colors.border, borderRadius: radius.pill, height: 24, justifyContent: "center", width: 24 }, reviewDotActive: { backgroundColor: colors.primary }, reviewLabel: { color: colors.muted, fontSize: 8, fontWeight: "600", textAlign: "center" }, reviewLabelActive: { color: colors.primary, fontWeight: "700" }, document: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md }, documentIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 46, justifyContent: "center", width: 46 }, documentReady: { backgroundColor: colors.accentSoft }, documentTitle: { color: colors.text, fontWeight: "700" }, documentCopy: { color: colors.muted, fontSize: 10, marginTop: 3 }, upload: { alignItems: "center", borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, justifyContent: "center", minHeight: 40, minWidth: 92, paddingHorizontal: 12, paddingVertical: 9 }, uploadText: { color: colors.primary, fontSize: 10, fontWeight: "700" }, notice: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.md }, noticeText: { color: colors.text, flex: 1, fontSize: 11, lineHeight: 18 }, primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 50 }, primaryText: { color: colors.surface, fontWeight: "700" }, disabled: { opacity: .45 }, nextStep: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.lg, flexDirection: "row", flexWrap: "wrap", gap: spacing.md, padding: spacing.md }, nextStepCopy: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 3 }, nextStepButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.md }, nextStepButtonText: { color: colors.surface, fontSize: 12, fontWeight: "700" }, success: { color: colors.success, fontWeight: "600" }, error: { color: colors.danger } });
