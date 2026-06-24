import {
  CoordinatorState,
  LogEvent,
  ResourceType,
  TransactionType,
  VoteValue,
} from './enums';

// ─── Coordinator Transaction (disimpan di DB coordinator) ────────────────────

export interface ITransaction {
  tx_id: string;
  type: TransactionType;
  source_branch: string;
  destination_branch: string;
  resource_type: ResourceType;
  resource_id: string;
  quantity: number;
  participants: string[];
  votes: Record<string, VoteValue | null>;
  state: CoordinatorState;
  branch_urls: Record<string, string>;
  created_at: Date;
  updated_at: Date;
}

// ─── Transaction Log ──────────────────────────────────────────────────────────

export interface ITransactionLog {
  tx_id: string;
  event: LogEvent;
  metadata: Record<string, unknown>;
  created_at: Date;
}

// ─── API Request/Response ─────────────────────────────────────────────────────

export interface TransferMaterialRequest {
  source_branch: string;
  destination_branch: string;
  resource_id: string;
  quantity: number;
}

export interface TransferMaterialResponse {
  success: boolean;
  tx_id: string;
  state: CoordinatorState;
  message: string;
  reason?: string;
  votes?: Record<string, VoteValue | null>;
}
