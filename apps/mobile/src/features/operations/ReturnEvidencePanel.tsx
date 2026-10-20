import { useQuery } from "@tanstack/react-query";
import type { User } from "@firebase/auth";
import { useEffect, useRef, useState } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useCurrentUser } from "../auth/use-current-user";
import { accessReturnEvidence, getReturnEvidence, type ReturnEvidenceFile } from "../operations/operations.api";
import { colors, radius, spacing } from "../../ui/tokens";

export function ReturnEvidencePanel({ returnId, scope = "admin" }: { returnId: string; scope?: "admin" | "customer" }) {
  const user = useCurrentUser();
  return <EvidencePanel key={`${user?.uid}:${returnId}:${scope}`} user={user} returnId={returnId} scope={scope} />;
}

function EvidencePanel({ user, returnId, scope }: { user: User | null; returnId: string; scope: "admin" | "customer" }) {
  const compact = useWindowDimensions().width < 620;
  const files = useQuery({ queryKey: ["return-evidence", user?.uid, returnId, scope], queryFn: () => getReturnEvidence(user!, returnId, scope), enabled: Boolean(user), retry: false });
  const [preview, setPreview] = useState<{ url: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = useRef(true);
  const activeUid = useRef(user?.uid); activeUid.current = user?.uid;
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    if (!preview) return;
    const timer = setTimeout(() => setPreview(null), Math.max(0, Date.parse(preview.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [preview]);
  const open = async (file: ReturnEvidenceFile, download: boolean) => {
    if (!user || busy || activeUid.current !== user.uid) return;
    const uid = user.uid;
    setBusy(true); setError(""); setPreview(null);
    try {
      const result = await accessReturnEvidence(user, returnId, file.id, download, scope);
      if (!active.current || activeUid.current !== uid) return;
      if (!result.url.startsWith("https://") || !Number.isFinite(Date.parse(result.expiresAt)) || Date.parse(result.expiresAt) <= Date.now()) throw new Error("Evidence link is unavailable. Try again.");
      if (download || file.mimeType === "application/pdf") await Linking.openURL(result.url);
      else setPreview(result);
    } catch (failure) { if (active.current && activeUid.current === uid) setError(failure instanceof Error ? failure.message : "Could not open evidence."); }
    finally { if (active.current && activeUid.current === uid) setBusy(false); }
  };
  return <View style={styles.panel}>
    <Text accessibilityRole="header" style={styles.title}>{scope === "customer" ? "Your return evidence" : "Private return evidence"}</Text>
    <Text style={styles.copy}>Links expire after five minutes. Do not share them.</Text>
    {files.isLoading ? <Text style={styles.copy}>Loading attachments...</Text> : null}
    {files.error ? <Pressable accessibilityRole="button" onPress={() => void files.refetch()} style={styles.button}><Text style={styles.copy}>Could not load evidence. Retry</Text></Pressable> : null}
    {files.data?.length === 0 ? <Text style={styles.copy}>No available attachments.</Text> : null}
    {files.data?.map((file) => <View key={file.id} style={styles.file}><Text style={styles.fileName}>{file.name}</Text><View style={[styles.actions, compact && styles.actionsCompact]}>
      {file.mimeType.startsWith("image/") ? <Pressable accessibilityRole="button" accessibilityLabel={`Preview ${file.name}`} disabled={busy} onPress={() => void open(file, false)} style={[styles.button, compact && styles.buttonCompact]}><Text style={styles.buttonText}>Preview image</Text></Pressable> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={`Download ${file.name}`} disabled={busy} onPress={() => void open(file, true)} style={[styles.button, compact && styles.buttonCompact]}><Text style={styles.buttonText}>Open / download</Text></Pressable>
    </View></View>)}
    {preview ? <><Image accessibilityLabel="Return evidence preview" source={{ uri: preview.url }} resizeMode="contain" style={[styles.image, compact && styles.imageCompact]} onError={() => { setPreview(null); setError("Preview failed. Request a new link or download the file."); }} /><Pressable accessibilityRole="button" onPress={() => setPreview(null)} style={[styles.button, compact && styles.buttonCompact]}><Text style={styles.buttonText}>Close preview</Text></Pressable></> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  panel: { padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, gap: spacing.sm },
  title: { color: colors.text, fontSize: 16, fontWeight: "600" },
  copy: { color: colors.text, flexShrink: 1 },
  file: { backgroundColor: colors.background, borderRadius: radius.md, gap: spacing.sm, padding: spacing.md },
  fileName: { color: colors.text, fontWeight: "600" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  actionsCompact: { flexDirection: "column" },
  button: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, justifyContent: "center", minHeight: 44, padding: spacing.md },
  buttonCompact: { width: "100%" },
  buttonText: { color: colors.primary, fontWeight: "700" },
  image: { backgroundColor: colors.background, borderRadius: radius.md, height: 240, width: "100%" },
  imageCompact: { height: 190 },
  error: { color: colors.danger }
});
