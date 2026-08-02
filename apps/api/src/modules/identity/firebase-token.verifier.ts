import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { ApiProblem } from "../../middleware/api-problem.js";
import { requireFirebaseAdminConfiguration } from "./firebase-admin.config.js";
import type { IdentityTokenVerifier, VerifiedIdentity } from "./identity.types.js";

function getFirebaseApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  const configuration = requireFirebaseAdminConfiguration(process.env);
  if (configuration.mode === "emulator") return initializeApp({ projectId: configuration.projectId });
  const credential = configuration.mode === "service_account"
    ? cert({ projectId: configuration.projectId, clientEmail: configuration.clientEmail, privateKey: configuration.privateKey })
    : applicationDefault();
  return initializeApp({ credential, projectId: configuration.projectId });
}

export class FirebaseTokenVerifier implements IdentityTokenVerifier {
  async verify(token: string): Promise<VerifiedIdentity> {
    try {
      const decoded = await getAuth(getFirebaseApp()).verifyIdToken(token, true);
      return {
        subject: decoded.uid,
        ...(decoded.email ? { email: decoded.email } : {}),
        ...(decoded.phone_number ? { phone: decoded.phone_number } : {}),
        ...(decoded.name ? { displayName: decoded.name } : {})
      };
    } catch (error) {
      if (error instanceof ApiProblem && error.code === "AUTH_PROVIDER_NOT_CONFIGURED") throw error;
      throw new ApiProblem(401, "INVALID_ACCESS_TOKEN", "The access token is invalid, expired, or revoked");
    }
  }
}
