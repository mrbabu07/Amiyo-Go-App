export type LegacyDocument = Record<string, unknown>;
export type TargetRow = { sourceCollection: string; legacyId: string; targetTable: string; targetId: string; data: Record<string, unknown> };
export type RejectedRow = { sourceCollection: string; legacyId: string | null; code: string; detail: string };
export type IdMapRow = { sourceCollection: string; legacyId: string; targetTable: string; targetId: string };
export type MigrationInput = Record<string, LegacyDocument[]>;
export type Reconciliation = { sourceCounts: Record<string, number>; targetCounts: Record<string, number>; rejectedCounts: Record<string, number>; monetaryTotals: Record<string, string>; accepted: number; rejected: number; digest: string };
export type MigrationResult = { rows: TargetRow[]; idMap: IdMapRow[]; rejectedRows: RejectedRow[]; reconciliation: Reconciliation };
