import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { ApiProblem } from "../../middleware/api-problem.js";
import type { IdentityTokenVerifier, VerifiedIdentity } from "./identity.types.js";

function getFirebaseApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const credential = projectId && clientEmail && privateKey
    ? cert({ projectId, clientEmail, privateKey })
    : applicationDefault();

  return initializeApp({ credential, ...(projectId ? { projectId } : {}) });
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
    } catch {
      throw new ApiProblem(401, "INVALID_ACCESS_TOKEN", "The access token is invalid, expired, or revoked");
    }
  }
}
