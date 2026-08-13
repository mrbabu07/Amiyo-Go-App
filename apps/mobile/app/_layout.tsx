import * as Sentry from "@sentry/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { StyleSheet, Text, useColorScheme, View } from "react-native";
import { AuthBootstrap } from "../src/features/auth/AuthBootstrap";
import { PushRegistration } from "../src/features/notifications/PushRegistration";
import { OfflineNotice } from "../src/ui/OfflineNotice";
import { ThemeProvider } from "../src/ui/ThemeProvider";
import { colors } from "../src/ui/tokens";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
Sentry.init({ dsn, enabled: Boolean(dsn), environment: __DEV__ ? "development" : "production", sendDefaultPii: false, tracesSampleRate: __DEV__ ? 0 : 0.1 });

function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { networkMode: "offlineFirst", retry: 2, staleTime: 30_000 } } }));
  const colorScheme = useColorScheme();
  return <Sentry.ErrorBoundary fallback={<CrashFallback />}>
    <ThemeProvider><QueryClientProvider client={queryClient}>
      <AuthBootstrap />
      <PushRegistration />
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <OfflineNotice />
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider></ThemeProvider>
  </Sentry.ErrorBoundary>;
}

function CrashFallback() { return <View style={styles.crash}><Text style={styles.title}>Something went wrong</Text><Text style={styles.body}>Close and reopen Amiyo-Go. The crash report is sent automatically when monitoring is configured.</Text></View>; }
const styles = StyleSheet.create({ crash: { alignItems: "center", backgroundColor: colors.background, flex: 1, justifyContent: "center", padding: 24 }, title: { color: colors.text, fontSize: 24, fontWeight: "900" }, body: { color: colors.muted, marginTop: 10, maxWidth: 420, textAlign: "center" } });
export default Sentry.wrap(RootLayout);
