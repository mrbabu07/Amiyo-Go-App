import * as Sentry from "@sentry/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, useColorScheme, View } from "react-native";
import { AuthBootstrap } from "../src/features/auth/AuthBootstrap";
import { PushRegistration } from "../src/features/notifications/PushRegistration";
import { OfflineNotice } from "../src/ui/OfflineNotice";
import { ThemeProvider } from "../src/ui/ThemeProvider";
import { colors, typography } from "../src/ui/tokens";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
Sentry.init({ dsn, enabled: Boolean(dsn), environment: __DEV__ ? "development" : "production", sendDefaultPii: false, tracesSampleRate: __DEV__ ? 0 : 0.1 });

function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { networkMode: "offlineFirst", retry: 2, staleTime: 30_000 } } }));
  const colorScheme = useColorScheme();
  return <Sentry.ErrorBoundary fallback={<CrashFallback />}>
    <ThemeProvider><QueryClientProvider client={queryClient}>
      <GlobalWebStyles />
      <AuthBootstrap />
      <PushRegistration />
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <OfflineNotice />
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider></ThemeProvider>
  </Sentry.ErrorBoundary>;
}

function GlobalWebStyles() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const styleId = "amiyo-web-fonts";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Croissant+One&family=Lora:ital,wght@0,400..700;1,400..700&family=Noto+Serif:ital,wght@0,100..900;1,100..900&family=Quicksand:wght@300..700&display=swap');
html, body, #root { font-family: ${typography.fontFamily}; }
body { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
* { font-family: ${typography.fontFamily}; }
`;
    document.head.appendChild(style);
  }, []);
  return null;
}

function CrashFallback() { return <View style={styles.crash}><Text style={styles.title}>Something went wrong</Text><Text style={styles.body}>Close and reopen Amiyo-Go. The crash report is sent automatically when monitoring is configured.</Text></View>; }
const styles = StyleSheet.create({ crash: { alignItems: "center", backgroundColor: colors.background, flex: 1, justifyContent: "center", padding: 24 }, title: { color: colors.text, fontFamily: typography.fontFamily, fontSize: 24, fontWeight: "700" }, body: { color: colors.muted, fontFamily: typography.fontFamily, marginTop: 10, maxWidth: 420, textAlign: "center" } });
export default Sentry.wrap(RootLayout);
