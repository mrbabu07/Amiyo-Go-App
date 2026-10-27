import * as Sentry from "@sentry/react-native";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, useColorScheme, View } from "react-native";
import { AuthBootstrap } from "../src/features/auth/AuthBootstrap";
import { PushRegistration } from "../src/features/notifications/PushRegistration";
import { getPublicPlatformSettings } from "../src/features/platform/platform.api";
import { OfflineNotice } from "../src/ui/OfflineNotice";
import { ThemeProvider } from "../src/ui/ThemeProvider";
import { colors, typography } from "../src/ui/tokens";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
Sentry.init({ dsn, enabled: Boolean(dsn), environment: __DEV__ ? "development" : "production", sendDefaultPii: false, tracesSampleRate: __DEV__ ? 0 : 0.1 });

function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { gcTime: 10 * 60_000, networkMode: "offlineFirst", retry: 1, retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 2_000), staleTime: 30_000 } } }));
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
  const platform = useQuery({ queryKey: ["platform", "public-settings"], queryFn: getPublicPlatformSettings, enabled: Platform.OS === "web", staleTime: 5 * 60_000 });
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const styleId = "amiyo-web-fonts";
    if (document.getElementById(styleId)) return;
    const fontLink = document.createElement("link");
    fontLink.id = `${styleId}-stylesheet`;
    fontLink.rel = "stylesheet";
    fontLink.href = "https://fonts.googleapis.com/css2?family=Croissant+One&family=Lora:wght@500;600&family=Quicksand:wght@400;500;600;700&display=swap";
    document.head.appendChild(fontLink);
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
html, body, #root { font-family: ${typography.fontFamily}; }
body { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
* { font-family: ${typography.fontFamily}; }
`;
    document.head.appendChild(style);
  }, []);
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined" || !platform.data) return;
    document.title = platform.data.seo.title;
    let description = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) { description = document.createElement("meta"); description.name = "description"; document.head.appendChild(description); }
    description.content = platform.data.seo.description;
  }, [platform.data]);
  return null;
}

function CrashFallback() { return <View style={styles.crash}><Text style={styles.title}>Something went wrong</Text><Text style={styles.body}>Close and reopen Amiyo-Go. The crash report is sent automatically when monitoring is configured.</Text></View>; }
const styles = StyleSheet.create({ crash: { alignItems: "center", backgroundColor: colors.background, flex: 1, justifyContent: "center", padding: 24 }, title: { color: colors.text, fontFamily: typography.fontFamily, fontSize: 24, fontWeight: "700" }, body: { color: colors.muted, fontFamily: typography.fontFamily, marginTop: 10, maxWidth: 420, textAlign: "center" } });
export default Sentry.wrap(RootLayout);
