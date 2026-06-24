// ─── Branch Registry ──────────────────────────────────────────────────────────

export interface BranchConfig {
  id: string;
  url: string;
}

export const BRANCH_IDS = ['bekasi', 'jakarta', 'bandung', 'semarang', 'surabaya'] as const;
export type BranchId = typeof BRANCH_IDS[number];
