import { reviewInputSchema } from "@amiyo/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { useCurrentUser } from "../auth/use-current-user";
import { getMyReviews, submitOrderReview } from "../engagement/engagement.api";
import { getMediaUploadStatus, pickAndUploadImage } from "../media/media.api";
import { ReviewImages } from "../engagement/ReviewImages";

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
  const lock = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const current = () => mounted.current && user && firebaseAuth?.currentUser?.uid === user.uid;
  const attach = async () => {
    if (!current() || uploadLock.current || lock.current || photos.length >= 5) return;
    uploadLock.current = true; setUploading(true); setUploadError("");
    try {
      const result = await pickAndUploadImage(user!, "review");
      if (result && current()) setPhotos((items) => [...items, { id: result.id, uri: result.localUri, ready: result.status === "ready", status: result.status }]);
    } catch (error) { if (current()) setUploadError(error instanceof Error ? error.message : "Photo upload failed."); }
    finally { uploadLock.current = false; if (current()) setUploading(false); }
  };
  const refreshPhotos = async () => {
    if (!current() || uploadLock.current || lock.current) return;
    uploadLock.current = true; setUploading(true); setUploadError("");
    try {
      const statuses = await Promise.all(photos.map((photo) => getMediaUploadStatus(user!, photo.id)));
      if (current()) setPhotos((items) => items.map((photo) => { const status = statuses.find((item) => item.id === photo.id); return status ? { ...photo, ready: status.ready, status: status.status } : photo; }));
    } catch (error) { if (current()) setUploadError(error instanceof Error ? error.message : "Could not check images."); }
    finally { uploadLock.current = false; if (current()) setUploading(false); }
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
    await cache.invalidateQueries({ queryKey: ["reviews", "mine", user?.uid] });
    if (current()) setOpen(false);
  } });
  if (!user) return null;
  if (existing.isLoading) return <Text style={styles.copy}>Checking your review…</Text>;
  if (existing.error) return <Pressable accessibilityRole="button" onPress={() => void existing.refetch()} style={styles.button}><Text style={styles.copy}>Could not check your review. Try again.</Text></Pressable>;
  if (existing.data?.[0]) return <View style={styles.panel}><Text style={styles.copy}>Your review for {productName}: {existing.data[0].rating}/5</Text><Text style={styles.copy}>{existing.data[0].body || "Rating submitted without a comment."}</Text><ReviewImages images={existing.data[0].images} /></View>;
  if (mutation.isSuccess) return <Text accessibilityLiveRegion="polite" style={styles.copy}>Review submitted for {productName}.</Text>;
  return <View style={styles.panel}>
    {!open ? <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.button}><Text style={styles.copy}>Write a review</Text></Pressable> : <>
      <Text accessibilityRole="header" style={styles.copy}>Review {productName}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Product rating" style={styles.ratings}>{[1, 2, 3, 4, 5].map((value) => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${value} out of 5 stars`} accessibilityState={{ checked: rating === value }} disabled={mutation.isPending} onPress={() => setRating(value)} style={[styles.button, rating === value && styles.selected]}><Text style={styles.copy}>{value} ★</Text></Pressable>)}</View>
      <Text style={styles.copy}>Your review (optional, 3–2000 characters)</Text>
      <TextInput accessibilityLabel="Your product review" multiline maxLength={2000} editable={!mutation.isPending} value={body} onChangeText={setBody} style={styles.input} />
      <Text style={styles.copy}>Optional photos · up to 5. Images become public with your review.</Text>
      {photos.map((photo, index) => <View key={photo.id} style={styles.panel}><Image accessibilityLabel={`Review photo ${index + 1}`} source={{ uri: photo.uri }} style={{ width: 96, height: 96 }} /><Text style={styles.copy}>{photo.ready ? "Ready" : `Processing status: ${photo.status}`}</Text><Pressable accessibilityRole="button" disabled={uploading || mutation.isPending} onPress={() => setPhotos((items) => items.filter((item) => item.id !== photo.id))} style={styles.button}><Text style={styles.copy}>Remove photo {index + 1}</Text></Pressable></View>)}
      <Pressable accessibilityRole="button" disabled={uploading || mutation.isPending || photos.length >= 5} onPress={() => void attach()} style={styles.button}><Text style={styles.copy}>{uploading ? "Checking/uploading photos…" : "Add photo"}</Text></Pressable>
      {photos.some((photo) => !photo.ready) ? <Pressable accessibilityRole="button" disabled={uploading || mutation.isPending} onPress={() => void refreshPhotos()} style={styles.button}><Text style={styles.copy}>Check image processing</Text></Pressable> : null}
      {uploadError ? <Text accessibilityRole="alert" style={styles.error}>{uploadError}</Text> : null}
      {mutation.error ? <Text accessibilityRole="alert" style={styles.error}>{mutation.error.message} If the request was interrupted, check My Reviews before submitting again.</Text> : null}
      <Pressable accessibilityRole="button" disabled={mutation.isPending || uploading || photos.some((photo) => !photo.ready) || (body.trim().length > 0 && body.trim().length < 3)} onPress={() => mutation.mutate()} style={styles.button}><Text style={styles.copy}>{mutation.isPending ? "Submitting…" : "Submit review"}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={mutation.isPending} onPress={() => setOpen(false)} style={styles.button}><Text style={styles.copy}>Cancel</Text></Pressable>
    </>}
  </View>;
}

const styles = StyleSheet.create({
  panel: { gap: spacing.sm },
  ratings: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  button: { minHeight: 44, minWidth: 44, padding: spacing.sm, justifyContent: "center", backgroundColor: colors.background, borderRadius: radius.md },
  selected: { backgroundColor: colors.primarySoft },
  copy: { color: colors.text, lineHeight: 21 },
  input: { color: colors.text, backgroundColor: colors.background, minHeight: 100, padding: spacing.md, borderRadius: radius.md },
  error: { color: colors.danger }
});
