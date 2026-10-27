export const sellerBulkActions = {
  ACCEPTED: { from: "PLACED", label: "Accept selected" },
  PROCESSING: { from: "ACCEPTED", label: "Start packing" },
  READY_TO_SHIP: { from: "PROCESSING", label: "Ready for pickup" }
} as const;
export type SellerBulkAction = keyof typeof sellerBulkActions;

export function eligibleSellerPackages<T extends { id: string; status: string }>(rows: T[], action: SellerBulkAction) {
  return [...new Map(rows.filter((row) => row.status === sellerBulkActions[action].from).map((row) => [row.id, row])).values()];
}

export async function runSellerBatch(ids: string[], send: (id: string) => Promise<void>, active: () => boolean, completed: (id: string) => void) {
  const unique = [...new Set(ids)];
  if (!unique.length || unique.length > 20) throw new Error("Choose 1 to 20 eligible packages.");
  for (const id of unique) {
    if (!active()) throw new Error("Account changed. Reopen seller orders.");
    await send(id);
    if (!active()) throw new Error("Account changed. Reopen seller orders.");
    completed(id);
  }
}
