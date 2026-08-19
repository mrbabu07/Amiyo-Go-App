import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, updateProfile, type User } from "firebase/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
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
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setSession = useAuthStore((state) => state.setSession);
  const emulatorEnabled = Boolean(process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL);
  const demoPassword = "AmiyoDemo123!";

  async function finishSignIn(user: User) {
    const session = await createSession(user);
    setSession(session);
    router.replace(destination(session.principal.roles) as never);
  }

  async function submit() {
    if (!firebaseAuth) return;
    setBusy(true);
    setError(null);
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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.replace("/")}><Text style={styles.back}>‹ Back to shop</Text></Pressable>
        <View style={styles.card}>
          <Text style={styles.brand}>Amiyo-Go</Text>
          <Text style={styles.title}>{mode === "login" ? "Welcome back" : "Create your account"}</Text>
          <Text style={styles.subtitle}>Shop, track orders, and manage delivery addresses securely.</Text>
          {!firebaseConfigured ? <Text style={styles.configError}>Firebase is not configured. Add the EXPO_PUBLIC_FIREBASE_* values to apps/mobile/.env.</Text> : null}
          {Platform.OS === "web" ? <><Pressable accessibilityLabel="Continue with Google" accessibilityRole="button" disabled={busy || !firebaseConfigured} onPress={continueWithGoogle} style={({ pressed }) => [styles.googleButton, (pressed || busy) && styles.pressed]}><View style={styles.googleMark}><Text style={styles.googleMarkText}>G</Text></View><Text style={styles.googleText}>Continue with Google</Text></Pressable><View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>OR CONTINUE WITH EMAIL</Text><View style={styles.dividerLine} /></View></> : null}
          {Platform.OS !== "web" && nativeGoogleConfigured && !emulatorEnabled ? <><GoogleNativeSignInButton busy={busy} onError={(message) => { setBusy(false); setError(message); }} onStart={() => { setBusy(true); setError(null); }} onSuccess={async (user) => { try { await finishSignIn(user); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not create your Amiyo-Go session"); } finally { setBusy(false); } }} /><View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>OR CONTINUE WITH EMAIL</Text><View style={styles.dividerLine} /></View></> : null}
          {mode === "register" ? <Field label="Full name" value={name} onChangeText={setName} placeholder="Your name" /> : null}
          <Field autoCapitalize="none" keyboardType="email-address" label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" />
          <Field autoCapitalize="none" label="Password" value={password} onChangeText={setPassword} placeholder="Minimum 6 characters" secureTextEntry />
          {emulatorEnabled && mode === "login" ? <View style={styles.demoPanel}><Text style={styles.demoTitle}>Local demo accounts</Text><View style={styles.demoRow}>{[{ label: "Customer", email: "customer@amiyo.test" }, { label: "Vendor", email: "vendor@amiyo.test" }, { label: "Admin", email: "admin@amiyo.test" }].map((account) => <Pressable key={account.label} onPress={() => { setEmail(account.email); setPassword(demoPassword); }} style={styles.demoButton}><Text style={styles.demoButtonText}>{account.label}</Text></Pressable>)}</View><Text style={styles.demoHint}>Password: {demoPassword}</Text></View> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable disabled={busy || !firebaseConfigured || !email || password.length < 6} onPress={submit} style={({ pressed }) => [styles.primary, (pressed || busy) && styles.pressed]}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{mode === "login" ? "Sign in" : "Create account"}</Text>}
          </Pressable>
          <Pressable onPress={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}>
            <Text style={styles.switchText}>{mode === "login" ? "New to Amiyo-Go? Create account" : "Already have an account? Sign in"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor="#94a3b8" style={styles.input} {...inputProps} /></View>;
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background, flex: 1 },
  content: { alignSelf: "center", justifyContent: "center", minHeight: "100%", padding: spacing.lg, width: "100%", maxWidth: 520 },
  back: { color: colors.primary, fontWeight: "600", marginBottom: spacing.md },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, padding: spacing.xl, ...Platform.select({ web: { boxShadow: "0 10px 24px rgba(26,26,46,0.08)" }, default: { shadowColor: colors.navy, shadowOpacity: 0.08, shadowRadius: 20 } }) },
  brand: { color: colors.primary, fontSize: 20, fontWeight: "700" },
  title: { color: colors.text, fontSize: 28, fontWeight: "700", marginTop: spacing.lg },
  subtitle: { color: colors.muted, lineHeight: 21, marginBottom: spacing.lg, marginTop: spacing.sm },
  configError: { backgroundColor: "#fef2f2", borderRadius: radius.md, color: colors.danger, marginBottom: spacing.md, padding: spacing.md },
  googleButton: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", justifyContent: "center", minHeight: 50, paddingHorizontal: spacing.md },
  googleMark: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, height: 28, justifyContent: "center", marginRight: spacing.sm, width: 28 },
  googleMarkText: { color: "#4285f4", fontSize: 16, fontWeight: "700" },
  googleText: { color: colors.text, fontSize: 14, fontWeight: "700" },
  divider: { alignItems: "center", flexDirection: "row", gap: spacing.sm, marginVertical: spacing.lg },
  dividerLine: { backgroundColor: colors.border, flex: 1, height: 1 },
  dividerText: { color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  field: { gap: 6, marginBottom: spacing.md },
  label: { color: colors.text, fontSize: 12, fontWeight: "600" },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, fontSize: 15, minHeight: 48, paddingHorizontal: 14 },
  error: { color: colors.danger, marginBottom: spacing.md },
  demoPanel: { backgroundColor: colors.primarySoft, borderRadius: radius.md, marginBottom: spacing.md, padding: spacing.md }, demoTitle: { color: colors.text, fontSize: 12, fontWeight: "700" }, demoRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm }, demoButton: { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 }, demoButtonText: { color: colors.primary, fontSize: 11, fontWeight: "700" }, demoHint: { color: colors.muted, fontSize: 10, marginTop: spacing.sm },
  primary: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", minHeight: 50 },
  pressed: { opacity: 0.7 },
  primaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  switchText: { color: colors.primary, fontWeight: "600", marginTop: spacing.lg, textAlign: "center" }
});
