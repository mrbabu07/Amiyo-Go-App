import type { ReturnDto } from "@amiyo/contracts";

const milestones = [
  { status: "REQUESTED", title: "Return requested" },
  { status: "PICKUP_SCHEDULED", title: "Pickup scheduled" },
  { status: "RECEIVED", title: "Item received" },
  { status: "REFUNDED", title: "Refund processed" }
] as const;

export function returnProgress(events: ReturnDto["events"]) {
  return milestones.map((milestone) => {
    const recorded = events?.filter((event) => event.toStatus === milestone.status && Number.isFinite(Date.parse(event.createdAt)))
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.id.localeCompare(right.id))[0];
    return { ...milestone, recordedAt: recorded?.createdAt ?? null };
  });
}
