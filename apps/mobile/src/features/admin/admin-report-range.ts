import type { AdminAnalyticsQuery } from "@amiyo/contracts";

export function buildCustomAdminRange(start: string, end: string): AdminAnalyticsQuery {
  const startsAt = new Date(`${start}T00:00:00+06:00`); const endsAt = new Date(`${end}T23:59:59.999+06:00`);
  if (!start || !end || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt) throw new Error("Choose a valid start and end date.");
  if (endsAt.getTime() - startsAt.getTime() > 366 * 86_400_000) throw new Error("Custom reports can cover at most 366 days.");
  return { range: "custom", startsAt, endsAt };
}
