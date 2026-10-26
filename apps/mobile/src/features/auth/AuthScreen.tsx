import { createUserWithEmailAndPassword, GoogleAuthProvider, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, updateProfile, type User } from "@firebase/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { createSession } from "./auth.api";
import { firebaseAuth, firebaseConfigured } from "./firebase";
import { useAuthStore } from "./auth.store";
import { GoogleNativeSignInButton, nativeGoogleConfigured } from "./GoogleNativeSignInButton";

function destination(roles: string[]) {
  if (roles.includes("SUPER_ADMIN") || roles.some((role) => role.endsWith("_ADMIN"))) return "/admin/dashboard";
  if (roles.some((role) => role.startsWith("VENDOR_"))) return "/vendor/dashboard";
  return "/account";
}

export function AuthScreen() {
  const compact = useWindowDimensions().width < 480;
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const setSession = useAuthStore((state) => state.setSession);
  const emulatorEnabled = Boolean(process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL);
  const demoPassword = "AmiyoDemo123!";

  async function finishSignIn(user: User) {
    const session = await createSession(user);
    setSession(session);
    router.replace(destination(session.principal.roles) as never);
  }

  async function submit() {
    if (!firebaseAuth || busy || !email.trim() || password.length < 6) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const credential = mode === "register"
        ? await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password)
        : await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      if (mode === "register") {
        if (name.trim()) await updateProfile(credential.user, { displayName: name.trim() });
        await credential.user.getIdToken(true);
      }
      await finishSignIn(credential.user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message.replace("Firebase: ", "") : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!firebaseAuth || busy) return;
    const normalizedEmail = email.trim();
    if (!normalizedEmail) { setError("Enter your email address first."); return; }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await sendPasswordResetEmail(firebaseAuth, normalizedEmail);
      setNotice("Password reset instructions were sent if this account exists.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message.replace("Firebase: ", "") : "Could not send password reset instructions");
    } finally {
      setBusy(false);
    }
  }

  async function continueWithGoogle() {
    if (!firebaseAuth || Platform.OS !== "web") return;
    setBusy(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(firebaseAuth, provider);
      await finishSignIn(credential.user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message.replace("Firebase: ", "") : "Google authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.page}>
      <ScrollView contentContainerStyle={[styles.content, compact && styles.contentCompact]} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="link" accessibilityLabel="Back to shop" onPress={() => router.replace("/")}><Text style={styles.back}>‹ Back to shop</Text></Pressable>
        <View style={[styles.card, compact && styles.cardCompact]}>
          <Text style={styles.brand}>Amiyo-Go</Text>
          <Text style={[styles.title, compact && styles.titleCompact]}>{mode === "login" ? "Welcome back" : "Create your account"}</Text>
          <Text style={styles.subtitle}>Shop, track orders, and manage delivery addresses securely.</Text>
          {!firebaseConfigured ? <Text style={styles.configError}>Firebase is not configured. Add the EXPO_PUBLIC_FIREBASE_* values to apps/mobile/.env.</Text> : null}
          {Platform.OS === "web" ? <><Pressable accessibilityLabel="Continue with Google" accessibilityRole="button" disabled={busy || !firebaseConfigured} onPress={continueWithGoogle} style={({ pressed }) => [styles.googleButton, (pressed || busy) && styles.pressed]}><View style={styles.googleMark}><Text style={styles.googleMarkText}>G</Text></View><Text style={styles.googleText}>Continue with Google</Text></Pressable><View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>OR CONTINUE WITH EMAIL</Text><View style={styles.dividerLine} /></View></> : null}
          {Platform.OS !== "web" && nativeGoogleConfigured && !emulatorEnabled ? <><GoogleNativeSignInButton busy={busy} onError={(message) => { setBusy(false); setError(message); }} onStart={() => { setBusy(true); setError(null); }} onSuccess={async (user) => { try { await finishSignIn(user); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not create your Amiyo-Go session"); } finally { setBusy(false); } }} /><View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>OR CONTINUE WITH EMAIL</Text><View style={styles.dividerLine} /></View></> : null}
          {mode === "register" ? <Field label="Full name" value={name} onChangeText={setName} placeholder="Your name" /> : null}
          <Field autoCapitalize="none" autoComplete="email" keyboardType="email-address" label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" />
          <Field autoCapitalize="none" autoComplete={mode === "login" ? "current-password" : "new-password"} label="Password" value={password} onChangeText={setPassword} placeholder="Minimum 6 characters" secureTextEntry returnKeyType="go" onSubmitEditing={() => void submit()} />
          {mode === "login" ? <Pressable accessibilityRole="button" accessibilityLabel="Reset password" disabled={busy} onPress={() => void resetPassword()}><Text style={styles.forgot}>Forgot password?</Text></Pressable> : null}
          {emulatorEnabled && mode === "login" ? <View style={styles.demoPanel}><Text style={styles.demoTitle}>Local demo accounts</Text><View style={styles.demoRow}>{[{ label: "Customer", email: "customer@amiyo.test" }, { label: "Vendor", email: "vendor@amiyo.test" }, { label: "Admin", email: "admin@amiyo.test" }].map((account) => <Pressable accessibilityRole="button" accessibilityLabel={`Use ${account.label.toLowerCase()} demo account`} disabled={busy} key={account.label} onPress={() => { setEmail(account.email); setPassword(demoPassword); }} style={[styles.demoButton, compact && styles.demoButtonCompact]}><Text style={styles.demoButtonText}>{account.label}</Text></Pressable>)}</View><Text style={styles.demoHint}>Password: {demoPassword}</Text></View> : null}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
          <Pressable accessibilityRole="button" accessibilityLabel={mode === "login" ? "Sign in" : "Create account"} accessibilityState={{ busy, disabled: busy || !firebaseConfigured || !email.trim() || password.length < 6 }} disabled={busy || !firebaseConfigured || !email.trim() || password.length < 6} onPress={submit} style={({ pressed }) => [styles.primary, (pressed || busy) && styles.pressed]}>
            {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryText}>{mode === "login" ? "Sign in" : "Create account"}</Text>}
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}>
            <Text style={styles.switchText}>{mode === "login" ? "New to Amiyo-Go? Create account" : "Already have an account? Sign in"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} style={styles.input} {...inputProps} /></View>;
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background, flex: 1 },
  content: { alignSelf: "center", justifyContent: "center", minHeight: "100%", padding: spacing.lg, width: "100%", maxWidth: 520 },
  contentCompact: { padding: spacing.md },
  back: { color: colors.primary, fontWeight: "600", marginBottom: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, ...Platform.select({ web: { boxShadow: "0 18px 50px rgba(11,31,58,0.12)" }, default: { elevation: 4, shadowColor: colors.navy, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 22 } }) },
  cardCompact: { padding: spacing.lg },
  brand: { color: colors.primary, fontSize: 20, fontWeight: "700" },
  title: { color: colors.text, fontSize: 28, fontWeight: "700", marginTop: spacing.lg },
  titleCompact: { fontSize: 24 },
  subtitle: { color: colors.muted, lineHeight: 21, marginBottom: spacing.lg, marginTop: spacing.sm },
  configError: { backgroundColor: colors.primarySoft, borderRadius: radius.md, color: colors.danger, marginBottom: spacing.md, padding: spacing.md },
  googleButton: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", justifyContent: "center", minHeight: 50, paddingHorizontal: spacing.md },
  googleMark: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, height: 28, justifyContent: "center", marginRight: spacing.sm, width: 28 },
  googleMarkText: { color: colors.primary, fontSize: 16, fontWeight: "700" },
  googleText: { color: colors.text, fontSize: 14, fontWeight: "700" },
  divider: { alignItems: "center", flexDirection: "row", gap: spacing.sm, marginVertical: spacing.lg },
  dividerLine: { backgroundColor: colors.border, flex: 1, height: 1 },
  dividerText: { color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  field: { gap: 6, marginBottom: spacing.md },
  label: { color: colors.text, fontSize: 12, fontWeight: "600" },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, fontSize: 15, minHeight: 48, paddingHorizontal: 14 },
  error: { color: colors.danger, marginBottom: spacing.md },
  notice: { backgroundColor: colors.accentSoft, borderRadius: radius.md, color: colors.text, marginBottom: spacing.md, padding: spacing.sm },
  forgot: { alignSelf: "flex-end", color: colors.primary, fontSize: 12, fontWeight: "600", marginBottom: spacing.md, marginTop: -spacing.sm },
  demoPanel: { backgroundColor: colors.accentSoft, borderRadius: radius.lg, marginBottom: spacing.md, padding: spacing.md }, demoTitle: { color: colors.text, fontSize: 12, fontWeight: "700" }, demoRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm }, demoButton: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.sm, justifyContent: "center", minHeight: 44, paddingHorizontal: 12, paddingVertical: 8 }, demoButtonCompact: { flex: 1, minWidth: 84 }, demoButtonText: { color: colors.primary, fontSize: 11, fontWeight: "700" }, demoHint: { color: colors.muted, fontSize: 10, marginTop: spacing.sm },
  primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 50 },
  pressed: { opacity: 0.7 },
  primaryText: { color: colors.surface, fontSize: 15, fontWeight: "700" },
  switchText: { color: colors.primary, fontWeight: "600", marginTop: spacing.lg, textAlign: "center" }
});
