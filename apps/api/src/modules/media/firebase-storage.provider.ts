import { getStorage } from "firebase-admin/storage";
import { ApiProblem } from "../../middleware/api-problem.js";
import { getFirebaseApp } from "../identity/firebase-token.verifier.js";

export type StoredObjectMetadata = { size: number; mimeType: string | null };
export interface MediaStorageProvider {
  createUploadUrl(storageKey: string, mimeType: string, expiresAt: Date): Promise<string>;
  metadata(storageKey: string): Promise<StoredObjectMetadata | null>;
  remove(storageKey: string): Promise<void>;
}

function bucket() {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET?.trim();
  if (!bucketName) throw new ApiProblem(503, "MEDIA_STORAGE_NOT_CONFIGURED", "Firebase Storage is not configured");
  return getStorage(getFirebaseApp()).bucket(bucketName);
}

export class FirebaseStorageProvider implements MediaStorageProvider {
  async createUploadUrl(storageKey: string, mimeType: string, expiresAt: Date) {
    const [url] = await bucket().file(storageKey).getSignedUrl({ version: "v4", action: "write", expires: expiresAt, contentType: mimeType });
    return url;
  }
  async metadata(storageKey: string) {
    const file = bucket().file(storageKey); const [exists] = await file.exists(); if (!exists) return null;
    const [metadata] = await file.getMetadata(); return { size: Number(metadata.size || 0), mimeType: metadata.contentType || null };
  }
  async remove(storageKey: string) { await bucket().file(storageKey).delete({ ignoreNotFound: true }); }
}
