import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { ApiProblem } from "../../middleware/api-problem.js";

const policySchema = z.object({ returnable: z.boolean().default(true), windowDays: z.number().int().min(1).max(90), requireEvidence: z.boolean() });
const categoryPolicySchema = policySchema;
export async function loadReturnPolicy(client: Pick<Prisma.TransactionClient, "platformConfiguration">) {
  const row = await client.platformConfiguration.findUnique({ where: { key: "default" }, select: { returnPolicy: true } });
  const parsed = policySchema.safeParse(row ? row.returnPolicy : { returnable: true, windowDays: 7, requireEvidence: true });
  if (!parsed.success) throw new ApiProblem(503, "RETURN_POLICY_INVALID", "Return policy is unavailable. Contact support.");
  return parsed.data;
}

export function effectiveReturnPolicy(globalPolicy: z.infer<typeof policySchema>, categoryPolicies: unknown[]) {
  const overrides = categoryPolicies.map((policy) => categoryPolicySchema.safeParse(policy)).filter((result) => result.success).map((result) => result.data);
  if (overrides.some((policy) => !policy.returnable)) return { ...globalPolicy, returnable: false };
  if (!overrides.length) return globalPolicy;
  return { returnable: true, windowDays: Math.min(globalPolicy.windowDays, ...overrides.map((policy) => policy.windowDays)), requireEvidence: globalPolicy.requireEvidence || overrides.some((policy) => policy.requireEvidence) };
}

export function returnWindow(input: { deadline: Date | null; deliveredAt: Date | null; policy: z.infer<typeof policySchema>; now: number }) {
  const deliveryTime = input.deliveredAt?.getTime();
  const deadline = input.deadline?.getTime() ?? (deliveryTime === undefined ? NaN : deliveryTime + input.policy.windowDays * 86400000);
  if (!Number.isFinite(deadline) || (deliveryTime !== undefined && (!Number.isFinite(deliveryTime) || deliveryTime > input.now))) return { deadline: null, reason: "DELIVERY_UNVERIFIED" as const };
  return { deadline: new Date(deadline).toISOString(), reason: input.now >= deadline ? "EXPIRED" as const : "AVAILABLE" as const };
}

export function assertReturnPolicy(input: { deadline: Date | null; deliveredAt: Date | null; evidenceCount: number; policy: z.infer<typeof policySchema>; now: number }) {
  if (!input.policy.returnable) throw new ApiProblem(409, "RETURN_CATEGORY_NOT_RETURNABLE", "One or more selected products are not returnable under their category policy.");
  const window = returnWindow(input);
  if (window.reason === "DELIVERY_UNVERIFIED") throw new ApiProblem(409, "RETURN_DELIVERY_DATE_MISSING", "Delivery dates need verification. Contact support.");
  if (window.reason === "EXPIRED") throw new ApiProblem(409, "RETURN_WINDOW_EXPIRED", "The return window has ended. Contact support to request an exception.");
  if (input.policy.requireEvidence && input.evidenceCount === 0) throw new ApiProblem(400, "RETURN_EVIDENCE_REQUIRED", "Attach a private image or PDF as required by the return policy.");
}
