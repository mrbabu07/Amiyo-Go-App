import { useRef, useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useMutation } from "@tanstack/react-query";
import { Link } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, spacing, radius } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { verifyDocumentQr } from "./orders.api";

export function DocumentVerificationScreen() {
  const [payload, setPayload] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [permission, requestPermission] = useCameraPermissions();
  const scanned = useRef(false);
  const user = firebaseAuth?.currentUser;
  const verification = useMutation({ mutationFn: (value: string) => {
    if (!user) throw new Error("Sign in to verify a document.");
    return verifyDocumentQr(user, value.trim());
  } });
  const result = verification.data;
  return <Screen title="Verify invoice or parcel" description="Paste the complete code from your QR reader to check its authenticity and current order record.">
    {!user ? <Link href="/login">Sign in to verify</Link> : <>
      {Platform.OS !== "web" ? <Pressable accessibilityRole="button" disabled={verification.isPending} style={styles.button} onPress={async () => {
        setCameraError("");
        try {
          const allowed = permission?.granted || (await requestPermission()).granted;
          if (!allowed) { setCameraError("Camera permission is required to scan. You can still paste a QR code below."); return; }
          scanned.current = false;
          verification.reset();
          setScanning(true);
        } catch { setCameraError("Camera unavailable. Paste the QR code below."); }
      }}><Text style={styles.buttonText}>Scan QR with camera</Text></Pressable> : null}
      {cameraError ? <Text accessibilityRole="alert" style={styles.error}>{cameraError}</Text> : null}
      {scanning ? <>
        <CameraView style={{ height: 280 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onMountError={() => { setScanning(false); setCameraError("Camera unavailable. Paste the code below."); }} onBarcodeScanned={({ data }) => {
          if (scanned.current) return;
          scanned.current = true;
          setScanning(false);
          setPayload(data.slice(0, 2000));
          verification.mutate(data);
        }} />
        <Pressable accessibilityRole="button" onPress={() => setScanning(false)} style={styles.button}><Text style={styles.buttonText}>Close camera</Text></Pressable>
      </> : null}
      <Text nativeID="document-code-label" style={styles.label}>Document QR code</Text>
      <TextInput accessibilityLabel="Document QR code" autoCapitalize="none" autoCorrect={false} editable={!verification.isPending} maxLength={2000} multiline onChangeText={(value) => { setPayload(value); verification.reset(); }} placeholder="AGI1|… or AGP2|…" placeholderTextColor={colors.muted} style={styles.input} value={payload} />
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: verification.isPending || !payload.trim() }} disabled={verification.isPending || !payload.trim()} onPress={() => verification.mutate(payload)} style={styles.button}><Text style={styles.buttonText}>{verification.isPending ? "Verifying…" : "Verify document"}</Text></Pressable>
      {verification.error ? <Text accessibilityRole="alert" style={styles.error}>{verification.error.message}</Text> : null}
      {result ? <View accessibilityLiveRegion="polite" style={styles.result}>
        <Text style={styles.label}>{result.valid ? result.currentRecord.matches ? "Signature and record verified" : "Signed document: record mismatch" : "Document could not be verified"}</Text>
        {!result.valid ? <Text style={styles.error}>{result.reason === "EXPIRED" ? "This code has expired. Request a newly issued document." : "The code is invalid or has been changed. Request a fresh copy."}</Text> : <>
          <Text style={styles.text}>Reference: {result.currentRecord.reference}</Text>
          <Text style={styles.text}>Current order status: {result.currentRecord.status.replaceAll("_", " ")}</Text>
          <Text style={styles.text}>Checked: {new Date(result.currentRecord.checkedAt).toLocaleString()}</Text>
          <Text style={styles.text}>Valid until: {new Date(result.claims.expiresAt).toLocaleString()}</Text>
          <Text style={styles.text}>Document verification does not confirm payment collection or delivery.</Text>
          {!result.currentRecord.matches ? <Text style={styles.error}>Do not use this document for payment or dispatch. Contact support for an updated copy.</Text> : null}
        </>}
      </View> : null}
    </>}
  </Screen>;
}

const styles = StyleSheet.create({
  label: { color: colors.text, fontWeight: "600", fontSize: 17 },
  text: { color: colors.text },
  input: { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, minHeight: 130, textAlignVertical: "top" },
  button: { backgroundColor: colors.primary, borderRadius: radius.md, minHeight: 48, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  result: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, gap: spacing.sm },
  error: { color: colors.danger }
});
