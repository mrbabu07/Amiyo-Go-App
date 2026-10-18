import { reviewInputSchema } from "@amiyo/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { useCurrentUser } from "../auth/use-current-user";
import { getMyReviews, submitOrderReview } from "../engagement/engagement.api";
import { ReviewImages } from "../engagement/ReviewImages";
import { getMediaUploadStatus, pickAndUploadImage } from "../media/media.api";

export function OrderReviewForm({ orderItemId, productName }: { orderItemId: string; productName: string }) {
  const user = useCurrentUser();
  const cache = useQueryClient();
  const existing = useQuery({ queryKey: ["reviews", "mine", user?.uid, orderItemId], queryFn: () => getMyReviews(user!, orderItemId), enabled: Boolean(user), retry: false });
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<Array<{ id: string; uri: string; ready: boolean; status: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const uploadLock = useRef(false);
  const mounted = useRef(true);
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;
  const lock = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const ownerUid = user?.uid;
  const current = () => mounted.current && Boolean(ownerUid) && activeUid.current === ownerUid;

  const attach = async () => {
    if (!current() || uploadLock.current || lock.current || photos.length >= 5) return;
    uploadLock.current = true;
    setUploading(true);
    setUploadError("");
    try {
      const result = await pickAndUploadImage(user!, "review");
      if (result && current()) setPhotos((items) => [...items, { id: result.id, uri: result.localUri, ready: result.status === "ready", status: result.status }]);
    } catch (error) {
      if (current()) setUploadError(error instanceof Error ? error.message : "Photo upload failed.");
    } finally {
      uploadLock.current = false;
      if (current()) setUploading(false);
    }
  };

  const refreshPhotos = async () => {
    if (!current() || uploadLock.current || lock.current) return;
    uploadLock.current = true;
    setUploading(true);
    setUploadError("");
    try {
      const statuses = await Promise.all(photos.map((photo) => getMediaUploadStatus(user!, photo.id)));
      if (current()) setPhotos((items) => items.map((photo) => { const status = statuses.find((item) => item.id === photo.id); return status ? { ...photo, ready: status.ready, status: status.status } : photo; }));
    } catch (error) {
      if (current()) setUploadError(error instanceof Error ? error.message : "Could not check images.");
    } finally {
      uploadLock.current = false;
      if (current()) setUploading(false);
    }
  };

  const mutation = useMutation({ retry: false, mutationFn: async () => {
    if (!current()) throw new Error("Your account changed. Reopen this order.");
    if (lock.current) throw new Error("Your review is already being submitted.");
    if (uploadLock.current || photos.some((photo) => !photo.ready)) throw new Error("Wait for your images to finish processing or remove them.");
    if (!existing.data || existing.error || existing.data.length) throw new Error("Check the existing review before submitting.");
    const input = reviewInputSchema.parse({ orderItemId, rating, body: body.trim() || null, mediaUploadIds: photos.map((photo) => photo.id) });
    lock.current = true;
    try { return await submitOrderReview(user!, input); } finally { lock.current = false; }
  }, onSuccess: async () => {
    if (!ownerUid || !current()) return;
    await cache.invalidateQueries({ queryKey: ["reviews", "mine", ownerUid] });
    if (current()) setOpen(false);
  } });

  if (!user) return null;
  if (existing.isLoading) return <View style={styles.statusRow}><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>Checking your review…</Text></View>;
  if (existing.error) return <Pressable accessibilityRole="button" onPress={() => void existing.refetch()} style={styles.secondary}><Ionicons color={colors.primary} name="refresh-outline" size={18} /><Text style={styles.secondaryText}>Could not check your review. Try again.</Text></Pressable>;
  if (existing.data?.[0]) return <View style={styles.existing}><View style={styles.existingHeading}><Ionicons color={colors.accent} name="star" size={20} /><Text style={styles.title}>Your review · {existing.data[0].rating}/5</Text></View><Text style={styles.copy}>{existing.data[0].body || "Rating submitted without a comment."}</Text><ReviewImages images={existing.data[0].images} /></View>;
  if (mutation.isSuccess) return <View accessibilityLiveRegion="polite" style={styles.success}><Ionicons color={colors.success} name="checkmark-circle" size={21} /><Text style={styles.successText}>Review submitted for {productName}.</Text></View>;

  return <View style={styles.panel}>
    {!open ? <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.reviewTrigger}><Ionicons color={colors.primary} name="star-outline" size={19} /><Text style={styles.reviewTriggerText}>Write a review</Text></Pressable> : <>
      <View style={styles.heading}><View style={styles.headingIcon}><Ionicons color={colors.primary} name="chatbox-ellipses-outline" size={23} /></View><View style={styles.headingCopy}><Text accessibilityRole="header" style={styles.title}>Review {productName}</Text><Text style={styles.muted}>Share an honest rating and optional photos with other shoppers.</Text></View></View>
      <View accessibilityRole="radiogroup" accessibilityLabel="Product rating" style={styles.ratings}>{[1, 2, 3, 4, 5].map((value) => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${value} out of 5 stars`} accessibilityState={{ checked: rating === value }} disabled={mutation.isPending} onPress={() => setRating(value)} style={[styles.starButton, rating === value && styles.starSelected]}><Ionicons color={rating >= value ? colors.accent : colors.muted} name={rating >= value ? "star" : "star-outline"} size={24} /><Text style={styles.starValue}>{value}</Text></Pressable>)}</View>
      <Text style={styles.label}>Your review <Text style={styles.optional}>(optional, 3–2000 characters)</Text></Text>
      <TextInput accessibilityLabel="Your product review" multiline maxLength={2000} editable={!mutation.isPending} placeholder="What did you like? How was the quality and delivery?" placeholderTextColor={colors.muted} value={body} onChangeText={setBody} style={styles.input} />
      <View style={styles.photoHeading}><View><Text style={styles.label}>Photos</Text><Text style={styles.muted}>Optional · up to 5 · public with your review</Text></View><Text style={styles.counter}>{photos.length}/5</Text></View>
      <View style={styles.photoGrid}>{photos.map((photo, index) => <View key={photo.id} style={styles.photoCard}><Image accessibilityLabel={`Review photo ${index + 1}`} source={{ uri: photo.uri }} style={styles.photo} /><View style={styles.photoStatus}><Ionicons color={photo.ready ? colors.success : colors.warning} name={photo.ready ? "checkmark-circle" : "time-outline"} size={16} /><Text style={styles.photoStatusText}>{photo.ready ? "Ready" : photo.status}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Remove evidence ${index + 1}`} disabled={uploading || mutation.isPending} onPress={() => setPhotos((items) => items.filter((item) => item.id !== photo.id))} style={styles.remove}><Ionicons color={colors.danger} name="trash-outline" size={17} /><Text style={styles.removeText}>Remove</Text></Pressable></View>)}</View>
      <Pressable accessibilityRole="button" disabled={uploading || mutation.isPending || photos.length >= 5} onPress={() => void attach()} style={[styles.secondary, (uploading || mutation.isPending || photos.length >= 5) && styles.disabled]}>{uploading ? <ActivityIndicator color={colors.primary} /> : <Ionicons color={colors.primary} name="camera-outline" size={19} />}<Text style={styles.secondaryText}>{uploading ? "Checking/uploading photos…" : "Add photo"}</Text></Pressable>
      {photos.some((photo) => !photo.ready) ? <Pressable accessibilityRole="button" disabled={uploading || mutation.isPending} onPress={() => void refreshPhotos()} style={styles.secondary}><Ionicons color={colors.primary} name="sync-outline" size={18} /><Text style={styles.secondaryText}>Check image processing</Text></Pressable> : null}
      {uploadError ? <Alert copy={uploadError} /> : null}
      {mutation.error ? <Alert copy={`${mutation.error.message} If the request was interrupted, check My Reviews before submitting again.`} /> : null}
      <View style={styles.actions}><Pressable accessibilityRole="button" disabled={mutation.isPending || uploading || photos.some((photo) => !photo.ready) || (body.trim().length > 0 && body.trim().length < 3)} onPress={() => mutation.mutate()} style={[styles.primary, (mutation.isPending || uploading || photos.some((photo) => !photo.ready) || (body.trim().length > 0 && body.trim().length < 3)) && styles.disabled]}>{mutation.isPending ? <ActivityIndicator color={colors.surface} /> : <Ionicons color={colors.surface} name="send-outline" size={18} />}<Text style={styles.primaryText}>{mutation.isPending ? "Submitting…" : "Submit review"}</Text></Pressable><Pressable accessibilityRole="button" disabled={mutation.isPending} onPress={() => setOpen(false)} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable></View>
    </>}
  </View>;
}

function Alert({ copy }: { copy: string }) { return <View accessibilityRole="alert" style={styles.error}><Ionicons color={colors.danger} name="alert-circle-outline" size={19} /><Text style={styles.errorText}>{copy}</Text></View>; }

const styles = StyleSheet.create({
  panel: { gap: spacing.md },
  statusRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.sm },
  heading: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm },
  headingIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 42, justifyContent: "center", width: 42 },
  headingCopy: { flex: 1, gap: 3 },
  title: { color: colors.text, flexShrink: 1, fontSize: 17, fontWeight: "700" },
  copy: { color: colors.text, lineHeight: 21 },
  muted: { color: colors.muted, flexShrink: 1, lineHeight: 19 },
  existing: { backgroundColor: colors.background, borderRadius: radius.md, gap: spacing.sm, padding: spacing.md },
  existingHeading: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  success: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  successText: { color: colors.success, flex: 1, fontWeight: "600" },
  reviewTrigger: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, minHeight: 46, paddingHorizontal: spacing.md },
  reviewTriggerText: { color: colors.primary, fontWeight: "700" },
  ratings: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  starButton: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, gap: 2, justifyContent: "center", minHeight: 54, minWidth: 54 },
  starSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  starValue: { color: colors.text, fontSize: 10, fontWeight: "700" },
  label: { color: colors.text, fontWeight: "700" },
  optional: { color: colors.muted, fontWeight: "500" },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 112, padding: spacing.md, textAlignVertical: "top" },
  photoHeading: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  counter: { color: colors.primary, fontWeight: "700" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  photoCard: { backgroundColor: colors.surface, borderRadius: radius.md, gap: spacing.sm, overflow: "hidden", padding: spacing.sm, width: 132 },
  photo: { borderRadius: radius.sm, height: 112, width: "100%" },
  photoStatus: { alignItems: "center", flexDirection: "row", gap: 5 },
  photoStatusText: { color: colors.muted, flex: 1, fontSize: 11 },
  remove: { alignItems: "center", flexDirection: "row", gap: 5, minHeight: 36 },
  removeText: { color: colors.danger, fontSize: 12, fontWeight: "600" },
  secondary: { alignItems: "center", alignSelf: "flex-start", borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 46, paddingHorizontal: spacing.md },
  secondaryText: { color: colors.primary, flexShrink: 1, fontWeight: "700" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.lg },
  primaryText: { color: colors.surface, fontWeight: "700" },
  cancel: { alignItems: "center", justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.lg },
  cancelText: { color: colors.muted, fontWeight: "700" },
  error: { alignItems: "flex-start", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  errorText: { color: colors.danger, flex: 1, lineHeight: 19 },
  disabled: { opacity: 0.5 }
});
