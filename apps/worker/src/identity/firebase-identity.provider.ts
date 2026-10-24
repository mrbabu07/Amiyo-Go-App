import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export interface IdentityProvider {
  deleteIdentity(providerSubject: string): Promise<void>;
}

function firebaseApp() {
  const existing = getApps()[0];
  if (existing) return existing;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is required for identity deletion");
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const credential = clientEmail && privateKey ? cert({ projectId, clientEmail, privateKey }) : applicationDefault();
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  return initializeApp({ credential, projectId, ...(storageBucket ? { storageBucket } : {}) });
}

export class FirebaseIdentityProvider implements IdentityProvider {
  async deleteIdentity(providerSubject: string) {
    try {
      await getAuth(firebaseApp()).deleteUser(providerSubject);
    } catch (error) {
      if ((error as { code?: string }).code === "auth/user-not-found") return;
      throw error;
    }
  }
}
