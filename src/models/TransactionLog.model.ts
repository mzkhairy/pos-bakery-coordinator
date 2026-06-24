import { Schema, model, Document } from 'mongoose';
import { LogEvent } from '../types';

export interface ITransactionLogDoc extends Document {
  tx_id: string;
  event: LogEvent;
  metadata: Record<string, unknown>;
  created_at: Date;
}

const transactionLogSchema = new Schema<ITransactionLogDoc>(
  {
    tx_id: { type: String, required: true },
    event: {
      type: String,
      enum: Object.values(LogEvent),
      required: true,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    created_at: { type: Date, default: Date.now },
  },
  {
    collection: 'transaction_logs',
    timestamps: false,
    versionKey: false,
  }
);

// Index: query log by tx_id + waktu
transactionLogSchema.index({ tx_id: 1, created_at: -1 });

export const TransactionLogModel = model<ITransactionLogDoc>(
  'TransactionLog',
  transactionLogSchema
);
