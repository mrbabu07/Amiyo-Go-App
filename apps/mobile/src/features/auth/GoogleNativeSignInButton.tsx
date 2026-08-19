import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { GoogleAuthProvider, signInWithCredential, type User } from "firebase/auth";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "./firebase";

WebBrowser.maybeCompleteAuthSession();

const platformClientId = Platform.select({ ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID, default: undefined });
export const nativeGoogleConfigured = Boolean(platformClientId && process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);

export function GoogleNativeSignInButton({ busy, onError, onStart, onSuccess }: { busy: boolean; onError(message: string): void; onStart(): void; onSuccess(user: User): Promise<void> }) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    selectAccount: true
  });
  const handledResponse = useRef<typeof response>(null);

  useEffect(() => {
    if (!response || handledResponse.current === response || response.type === "dismiss" || response.type === "cancel") return;
    handledResponse.current = response;
    if (response.type !== "success" || !response.params.id_token || !firebaseAuth) {
      onError(response.type === "error" ? response.error?.description || response.errorCode || "Google authentication failed" : "Google did not return an identity token");
      return;
    }
    void signInWithCredential(firebaseAuth, GoogleAuthProvider.credential(response.params.id_token)).then((credential) => onSuccess(credential.user)).catch((error: unknown) => onError(error instanceof Error ? error.message.replace("Firebase: ", "") : "Google authentication failed"));
  }, [onError, onSuccess, response]);

  return <Pressable accessibilityLabel="Continue with Google" accessibilityRole="button" disabled={busy || !request} onPress={() => { onStart(); void promptAsync(); }} style={({ pressed }) => [styles.button, (pressed || busy || !request) && styles.disabled]}>{busy ? <ActivityIndicator color={colors.text} /> : <><View style={styles.mark}><Text style={styles.markText}>G</Text></View><Text style={styles.text}>Continue with Google</Text></>}</Pressable>;
}

const styles = StyleSheet.create({ button: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", justifyContent: "center", minHeight: 50, paddingHorizontal: spacing.md }, disabled: { opacity: 0.6 }, mark: { alignItems: "center", borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, height: 28, justifyContent: "center", marginRight: spacing.sm, width: 28 }, markText: { color: "#4285f4", fontSize: 16, fontWeight: "700" }, text: { color: colors.text, fontSize: 14, fontWeight: "700" } });
