import { createReturnSchema, type CreateReturn, type OrderDto } from "@amiyo/contracts";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { buildReturnSelection, remainingReturnQuantity } from "./return-selection";
import { useCurrentUser } from "../auth/use-current-user";
import { firebaseAuth } from "../auth/firebase";
import { pickAndUploadDocument } from "../media/media.api";

const reasons = [{ code: "DAMAGED", label: "Damaged item" }, { code: "DEFECTIVE", label: "Not working" }, { code: "WRONG_ITEM", label: "Wrong item" }, { code: "OTHER", label: "Other issue" }];

export function CustomerReturnForm({ vendorOrder, busy, onSubmit }: { vendorOrder: OrderDto["vendorOrders"][number]; busy: boolean; onSubmit(input: CreateReturn): Promise<unknown> }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [method, setMethod] = useState<CreateReturn["refundMethod"]>("ORIGINAL_PAYMENT");
  const [review, setReview] = useState<CreateReturn | null>(null);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const [sending, setSending] = useState(false);
  const user = useCurrentUser();
  const [files, setFiles] = useState<Array<{ key: string; name: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const uploadLock = useRef(false);
  const disabled = busy || sending || uploading;
  const attach = async () => {
    if (!user || disabled || uploadLock.current || files.length >= 5) return;
    const accountId = user.uid;
    uploadLock.current = true; setUploading(true); setError("");
    try {
      const uploaded = await pickAndUploadDocument(user, "return_evidence");
      if (uploaded && firebaseAuth?.currentUser?.uid === accountId) setFiles((current) => current.length < 5 ? [...current, { key: uploaded.storageKey, name: uploaded.originalName }] : current);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not attach evidence."); }
    finally { uploadLock.current = false; setUploading(false); }
  };
  const prepare = () => {
    try { setReview(createReturnSchema.parse({ ...buildReturnSelection(vendorOrder.id, vendorOrder.items, quantities, reason, detail, method), evidenceStorageKeys: files.map((file) => file.key) })); setError(""); }
    catch (failure) { setError(reason ? (failure instanceof Error ? failure.message : "Check your selection.") : "Choose a return reason."); }
  };
  const submit = async () => {
    if (!review || disabled || submitting.current) return;
    submitting.current = true; setSending(true); setError("");
    try {
      const checked = buildReturnSelection(vendorOrder.id, vendorOrder.items, Object.fromEntries(review.items.map((item) => [item.orderItemId, item.quantity])), review.reasonCode, review.reasonDetail ?? "", review.refundMethod);
      await onSubmit({ ...checked, evidenceStorageKeys: review.evidenceStorageKeys });
    }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not submit your return."); }
    finally { submitting.current = false; setSending(false); }
  };
  return <View style={styles.panel}>
    <Text accessibilityRole="header" style={styles.title}>Request a return</Text>
    <Text style={styles.copy}>Select only the items and quantities you want to return. Eligibility and previously requested quantities are checked by the server.</Text>
    {review ? <>
      {review.items.map((item) => <Text key={item.orderItemId} style={styles.copy}>{vendorOrder.items.find((entry) => entry.id === item.orderItemId)?.productName} × {item.quantity}</Text>)}
      <Text style={styles.copy}>Reason: {reasons.find((entry) => entry.code === review.reasonCode)?.label}</Text>
      {review.reasonDetail ? <Text style={styles.copy}>{review.reasonDetail}</Text> : null}
      <Text style={styles.copy}>Evidence: {files.length} file(s)</Text>
      {files.map((file) => <Text key={file.key} style={styles.copy}>{file.name}</Text>)}
      <Text style={styles.copy}>Refund: {review.refundMethod === "MANUAL" ? "Manual arrangement after approval" : "Original payment method"}. Submitting is not a refund approval.</Text>
      <Pressable accessibilityRole="button" disabled={disabled} onPress={() => void submit()} style={[styles.primary, disabled && styles.disabled]}><Text style={styles.light}>{disabled ? "Submitting..." : "Confirm return request"}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={disabled} onPress={() => setReview(null)} style={styles.option}><Text style={styles.copy}>Edit selection</Text></Pressable>
    </> : <>
      {vendorOrder.items.map((item) => {
        const quantity = quantities[item.id] ?? 0;
        const remaining = remainingReturnQuantity(item);
        return <View key={item.id} style={styles.item}>
          <Text style={styles.copy}>{item.productName} · {item.sku} · Purchased: {item.quantity} · Remaining to request: {remaining}</Text>
          <View style={styles.row}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove one ${item.productName} from return`} disabled={disabled || quantity === 0} onPress={() => setQuantities((current) => ({ ...current, [item.id]: Math.max(0, (current[item.id] ?? 0) - 1) }))} style={styles.step}><Text style={styles.copy}>−</Text></Pressable>
            <Text accessibilityLabel={`Return quantity ${quantity}`} style={styles.copy}>{quantity}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Add one ${item.productName} to return`} disabled={disabled || quantity >= remaining} onPress={() => setQuantities((current) => ({ ...current, [item.id]: Math.min(remaining, (current[item.id] ?? 0) + 1) }))} style={styles.step}><Text style={styles.copy}>+</Text></Pressable>
          </View>
        </View>;
      })}
      <Text style={styles.title}>Reason</Text>
      {reasons.map((entry) => <Pressable key={entry.code} accessibilityRole="radio" accessibilityState={{ checked: reason === entry.code }} disabled={disabled} onPress={() => setReason(entry.code)} style={[styles.option, reason === entry.code && styles.selected]}><Text style={styles.copy}>{entry.label}</Text></Pressable>)}
      <Text style={styles.copy}>Additional details (optional)</Text>
      <TextInput accessibilityLabel="Return details" multiline maxLength={1000} editable={!disabled} value={detail} onChangeText={setDetail} style={styles.input} />
      <Text style={styles.title}>Evidence ({files.length}/5, optional)</Text>
      <Text style={styles.copy}>Attach photos or PDFs. Avoid including unrelated personal or payment information.</Text>
      <Pressable accessibilityRole="button" disabled={disabled || files.length >= 5 || !user} onPress={() => void attach()} style={styles.option}><Text style={styles.copy}>{uploading ? "Uploading evidence..." : "Add image or PDF"}</Text></Pressable>
      {files.map((file) => <View key={file.key} style={styles.item}><Text style={styles.copy}>{file.name}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Remove evidence ${file.name}`} disabled={disabled} onPress={() => setFiles((current) => current.filter((entry) => entry.key !== file.key))} style={styles.option}><Text style={styles.copy}>Remove attachment</Text></Pressable></View>)}
      <Text style={styles.title}>Refund preference</Text>
      {(["ORIGINAL_PAYMENT", "MANUAL"] as const).map((value) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: method === value }} disabled={disabled} onPress={() => setMethod(value)} style={[styles.option, method === value && styles.selected]}><Text style={styles.copy}>{value === "MANUAL" ? "Manual arrangement with support" : "Original payment method"}</Text></Pressable>)}
      <Pressable accessibilityRole="button" disabled={disabled} onPress={prepare} style={styles.primary}><Text style={styles.light}>Review return request</Text></Pressable>
    </>}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  panel: { gap: spacing.sm, marginTop: spacing.md, minWidth: 0 },
  title: { color: colors.text, fontWeight: "600", fontSize: 16 },
  copy: { color: colors.text, lineHeight: 20, flexShrink: 1 },
  item: { gap: spacing.sm, paddingVertical: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  step: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md },
  option: { padding: spacing.md, minHeight: 44, borderRadius: radius.md, backgroundColor: colors.surface },
  selected: { backgroundColor: colors.primarySoft },
  primary: { padding: spacing.md, minHeight: 44, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: "center" },
  light: { color: "#fff", fontWeight: "600" },
  input: { minHeight: 80, padding: spacing.md, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  error: { color: colors.danger },
  disabled: { opacity: 0.5 }
});
