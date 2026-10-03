import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useCurrentUser } from "../auth/use-current-user";
import { firebaseAuth } from "../auth/firebase";
import { accessReturnEvidence, getReturnEvidence, type ReturnEvidenceFile } from "../operations/operations.api";
import { colors, radius, spacing } from "../../ui/tokens";

export function ReturnEvidencePanel({ returnId }: { returnId: string }) {
  const user = useCurrentUser();
  const files = useQuery({ queryKey: ["return-evidence", user?.uid, returnId], queryFn: () => getReturnEvidence(user!, returnId), enabled: Boolean(user) });
  const [preview, setPreview] = useState<{ url: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    if (!preview) return;
    const timer = setTimeout(() => setPreview(null), Math.max(0, Date.parse(preview.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [preview]);
  const open = async (file: ReturnEvidenceFile, download: boolean) => {
    if (!user || busy) return;
    const uid = user.uid;
    setBusy(true); setError(""); setPreview(null);
    try {
      const result = await accessReturnEvidence(user, returnId, file.id, download);
      if (!active.current || firebaseAuth?.currentUser?.uid !== uid) return;
      if (!result.url.startsWith("https://") || !Number.isFinite(Date.parse(result.expiresAt)) || Date.parse(result.expiresAt) <= Date.now()) throw new Error("Evidence link is unavailable. Try again.");
      if (download || file.mimeType === "application/pdf") await Linking.openURL(result.url);
      else setPreview(result);
    } catch (failure) { if (active.current) setError(failure instanceof Error ? failure.message : "Could not open evidence."); }
    finally { if (active.current) setBusy(false); }
  };
  return <View style={styles.panel}>
    <Text accessibilityRole="header" style={styles.title}>Private return evidence</Text>
    <Text style={styles.copy}>Links expire after five minutes. Do not share them.</Text>
    {files.isLoading ? <Text style={styles.copy}>Loading attachments...</Text> : null}
    {files.error ? <Pressable accessibilityRole="button" onPress={() => void files.refetch()} style={styles.button}><Text style={styles.copy}>Could not load evidence. Retry</Text></Pressable> : null}
    {files.data?.length === 0 ? <Text style={styles.copy}>No available attachments.</Text> : null}
    {files.data?.map((file) => <View key={file.id} style={styles.file}><Text style={styles.copy}>{file.name}</Text><View style={styles.actions}>
      {file.mimeType.startsWith("image/") ? <Pressable accessibilityRole="button" accessibilityLabel={`Preview ${file.name}`} disabled={busy} onPress={() => void open(file, false)} style={styles.button}><Text style={styles.copy}>Preview image</Text></Pressable> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={`Download ${file.name}`} disabled={busy} onPress={() => void open(file, true)} style={styles.button}><Text style={styles.copy}>Open / download</Text></Pressable>
    </View></View>)}
    {preview ? <><Image accessibilityLabel="Return evidence preview" source={{ uri: preview.url }} resizeMode="contain" style={styles.image} onError={() => { setPreview(null); setError("Preview failed. Request a new link or download the file."); }} /><Pressable accessibilityRole="button" onPress={() => setPreview(null)} style={styles.button}><Text style={styles.copy}>Close preview</Text></Pressable></> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  panel: { padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, gap: spacing.sm },
  title: { color: colors.text, fontSize: 16, fontWeight: "600" },
  copy: { color: colors.text, flexShrink: 1 },
  file: { gap: spacing.sm, paddingVertical: spacing.sm },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  button: { minHeight: 44, justifyContent: "center", padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  image: { width: "100%", height: 240 },
  error: { color: colors.danger }
});
