import { Schema, model, Document } from 'mongoose';
import { CoordinatorState, LogEvent, ResourceType, TransactionType, VoteValue } from '../types';

export interface ITransactionDoc extends Document {
  tx_id: string;
  type: TransactionType;
  source_branch: string;
  destination_branch: string;
  resource_type: ResourceType;
  resource_id: string;
  quantity: number;
  participants: string[];
  votes: Map<string, VoteValue | null>;
  state: CoordinatorState;
  branch_urls: Map<string, string>;
  created_at: Date;
  updated_at: Date;
}

const transactionSchema = new Schema<ITransactionDoc>(
  {
    tx_id: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
    },
    source_branch: { type: String, required: true },
    destination_branch: { type: String, required: true },
    resource_type: {
      type: String,
      enum: Object.values(ResourceType),
      required: true,
    },
    resource_id: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    participants: [{ type: String }],
    votes: {
      type: Map,
      of: String,
      default: {},
    },
    state: {
      type: String,
      enum: Object.values(CoordinatorState),
      required: true,
      default: CoordinatorState.INIT,
    },
    branch_urls: {
      type: Map,
      of: String,
      required: true,
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    collection: 'transactions',
    timestamps: false,
    versionKey: false,
  }
);

// Index: recovery lookup — cari state yang belum selesai
transactionSchema.index({ state: 1 });
transactionSchema.index({ tx_id: 1 }, { unique: true });

export const TransactionModel = model<ITransactionDoc>('Transaction', transactionSchema);
