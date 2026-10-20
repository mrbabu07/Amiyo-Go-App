import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Modal, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";

export function ReviewImages({ images }: { images: Array<{ id: string; url: string }> }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIndex = images.findIndex((image) => image.id === selectedId);
  const selected = images[selectedIndex];
  if (!images.length) return null;
  return <View style={styles.row}>
    {images.map((image, index) => <ReviewThumbnail image={image} index={index} key={image.id} onOpen={() => setSelectedId(image.id)} />)}
    <Modal visible={Boolean(selected)} animationType="fade" onRequestClose={() => setSelectedId(null)}>
      <SafeAreaView style={styles.safe}>
      <View style={styles.viewer} accessibilityViewIsModal>
        <View style={styles.controls}><Text accessibilityRole="header" style={styles.text}>Review photo {selectedIndex + 1} of {images.length}</Text><Pressable accessibilityRole="button" onPress={() => setSelectedId(null)} style={styles.button}><Text style={styles.text}>Close photo</Text></Pressable></View>
        {selected ? <ReviewPhoto key={`${selected.id}:${selected.url}`} url={selected.url} position={selectedIndex + 1} /> : null}
        <View style={styles.controls}><Pressable accessibilityRole="button" disabled={selectedIndex <= 0} onPress={() => setSelectedId(images[selectedIndex - 1]!.id)} style={styles.button}><Text style={[styles.text, selectedIndex <= 0 && styles.disabled]}>Previous photo</Text></Pressable><Pressable accessibilityRole="button" disabled={selectedIndex >= images.length - 1} onPress={() => setSelectedId(images[selectedIndex + 1]!.id)} style={styles.button}><Text style={[styles.text, selectedIndex >= images.length - 1 && styles.disabled]}>Next photo</Text></Pressable></View>
      </View>
      </SafeAreaView>
    </Modal>
  </View>;
}

function ReviewThumbnail({ image, index, onOpen }: { image: { id: string; url: string }; index: number; onOpen(): void }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const label = failed ? `Retry customer review photo ${index + 1}` : `Open customer review photo ${index + 1}`;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => failed ? (setFailed(false), setAttempt((value) => value + 1)) : onOpen()} style={({ pressed }) => [styles.thumbnail, pressed && styles.pressed]}>
    {failed ? <View style={styles.thumbnailFeedback}><Ionicons color={colors.muted} name="refresh-outline" size={22} /><Text style={styles.thumbnailFeedbackText}>Retry</Text></View> : <Image key={attempt} accessibilityLabel={`Customer review photo ${index + 1}`} source={{ uri: image.url }} onError={() => setFailed(true)} resizeMode="cover" style={styles.image} />}
  </Pressable>;
}

function ReviewPhoto({ url, position }: { url: string; position: number }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return <View style={styles.preview}>{failed ? <View style={styles.feedback}><Text accessibilityRole="alert" style={styles.text}>This review photo could not load.</Text><Pressable accessibilityRole="button" onPress={() => { setFailed(false); setAttempt((value) => value + 1); }} style={styles.button}><Text style={styles.text}>Retry photo</Text></Pressable></View> : <Image key={attempt} accessibilityLabel={`Customer review photo ${position}, enlarged`} source={{ uri: url }} resizeMode="contain" onError={() => setFailed(true)} style={styles.largeImage} />}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  thumbnail: { backgroundColor: colors.accentSoft, borderRadius: radius.md, boxShadow: "0 5px 16px rgba(11,31,58,.08)", height: 96, minHeight: 44, minWidth: 44, overflow: "hidden", width: 96 },
  image: { height: "100%", width: "100%" },
  thumbnailFeedback: { alignItems: "center", flex: 1, gap: 3, justifyContent: "center" },
  thumbnailFeedbackText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  viewer: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.md },
  controls: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  button: { minHeight: 44, minWidth: 44, padding: spacing.sm, justifyContent: "center" },
  text: { color: colors.text, fontSize: 14 },
  disabled: { color: colors.muted, opacity: 0.6 },
  preview: { flex: 1, minHeight: 0 },
  largeImage: { width: "100%", height: "100%" },
  feedback: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md }
});
