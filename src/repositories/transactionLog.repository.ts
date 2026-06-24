import { TransactionLogModel, ITransactionLogDoc } from '../models';
import { LogEvent } from '../types';

export class TransactionLogRepository {
  async log(
    txId: string,
    event: LogEvent,
    metadata: Record<string, unknown> = {}
  ): Promise<ITransactionLogDoc> {
    const entry = new TransactionLogModel({
      tx_id: txId,
      event,
      metadata,
      created_at: new Date(),
    });
    return entry.save();
  }

  async findByTxId(txId: string): Promise<ITransactionLogDoc[]> {
    return TransactionLogModel.find({ tx_id: txId }).sort({ created_at: 1 });
  }
}

export const transactionLogRepository = new TransactionLogRepository();
