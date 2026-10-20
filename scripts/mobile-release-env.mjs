import { parseMobilePublicEnv } from "@amiyo/config";

try {
  const env = parseMobilePublicEnv(process.env);
  console.log(JSON.stringify({ status: "ready", profile: env.EAS_BUILD_PROFILE ?? "development", apiProtocol: new URL(env.EXPO_PUBLIC_API_URL).protocol, firebaseConfigured: Boolean(env.EXPO_PUBLIC_FIREBASE_PROJECT_ID), emulatorConfigured: Boolean(env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL), sentryConfigured: Boolean(env.EXPO_PUBLIC_SENTRY_DSN), easProjectConfigured: Boolean(env.EXPO_PUBLIC_EAS_PROJECT_ID) }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
