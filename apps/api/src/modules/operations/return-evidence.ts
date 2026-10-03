import type { Prisma } from "@prisma/client";
import { ApiProblem } from "../../middleware/api-problem.js";

export async function validateCustomerReturnEvidence(client: Pick<Prisma.TransactionClient, "mediaUpload">, userId: string, keys: string[] = []) {
  if (keys.length > 5 || new Set(keys).size !== keys.length) throw new ApiProblem(400, "RETURN_EVIDENCE_INVALID", "Choose up to five unique evidence files");
  if (!keys.length) return [];
  const uploads = await client.mediaUpload.findMany({ where: { userId, purpose: "return_evidence", visibility: "private", storageKey: { in: keys }, status: { in: ["uploaded", "processing", "ready"] } }, select: { storageKey: true } });
  const found = new Set(uploads.map((upload) => upload.storageKey));
  if (keys.some((key) => !found.has(key))) throw new ApiProblem(400, "RETURN_EVIDENCE_INVALID", "Every evidence file must be a completed private return upload owned by you");
  return keys;
}
