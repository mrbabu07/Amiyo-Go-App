import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

function app() { const existing = getApps()[0]; if (existing) return existing; const projectId = process.env.FIREBASE_PROJECT_ID; const storageBucket = process.env.FIREBASE_STORAGE_BUCKET; if (!projectId || !storageBucket) throw new Error("Firebase media storage is not configured"); const clientEmail = process.env.FIREBASE_CLIENT_EMAIL; const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"); const credential = clientEmail && privateKey ? cert({ projectId, clientEmail, privateKey }) : applicationDefault(); return initializeApp({ credential, projectId, storageBucket }); }
function bucket() { const name = process.env.FIREBASE_STORAGE_BUCKET; if (!name) throw new Error("FIREBASE_STORAGE_BUCKET is required"); return getStorage(app()).bucket(name); }
export interface WorkerMediaStorage { download(storageKey: string): Promise<Buffer>; remove(storageKey: string): Promise<void>; }
export class FirebaseWorkerMediaStorage implements WorkerMediaStorage { async download(storageKey: string) { const [content] = await bucket().file(storageKey).download(); return content; } async remove(storageKey: string) { await bucket().file(storageKey).delete({ ignoreNotFound: true }); } }
