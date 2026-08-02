import { ApiProblem } from "../../middleware/api-problem.js";

type FirebaseAdminConfiguration =
  | { mode: "emulator"; projectId: string; emulatorHost: string }
  | { mode: "service_account"; projectId: string; clientEmail: string; privateKey: string }
  | { mode: "application_default"; projectId: string }
  | { mode: "unconfigured" };

export function resolveFirebaseAdminConfiguration(env: NodeJS.ProcessEnv): FirebaseAdminConfiguration {
  const projectId = env.FIREBASE_PROJECT_ID?.trim();
  const emulatorHost = env.FIREBASE_AUTH_EMULATOR_HOST?.trim();
  if (emulatorHost) {
    if (env.NODE_ENV === "production") throw new Error("Firebase Auth emulator cannot be used in production");
    if (!projectId) throw new Error("FIREBASE_PROJECT_ID is required with FIREBASE_AUTH_EMULATOR_HOST");
    return { mode: "emulator", projectId, emulatorHost };
  }

  const clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  const suppliedServiceAccountFields = [projectId, clientEmail, privateKey].filter(Boolean).length;
  if (suppliedServiceAccountFields > 0 && suppliedServiceAccountFields < 3 && env.FIREBASE_USE_APPLICATION_DEFAULT !== "true") {
    throw new Error("Firebase service-account configuration is incomplete");
  }
  if (projectId && clientEmail && privateKey) return { mode: "service_account", projectId, clientEmail, privateKey };
  if (projectId && env.FIREBASE_USE_APPLICATION_DEFAULT === "true") return { mode: "application_default", projectId };
  return { mode: "unconfigured" };
}

export function requireFirebaseAdminConfiguration(env: NodeJS.ProcessEnv) {
  const configuration = resolveFirebaseAdminConfiguration(env);
  if (configuration.mode === "unconfigured") throw new ApiProblem(503, "AUTH_PROVIDER_NOT_CONFIGURED", "Firebase Admin authentication is not configured");
  return configuration;
}
