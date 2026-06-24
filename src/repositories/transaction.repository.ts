import { TransactionModel, ITransactionDoc } from '../models';
import { CoordinatorState, TransactionType, ResourceType, VoteValue } from '../types';

export class TransactionRepository {
  async create(params: {
    tx_id: string;
    type: TransactionType;
    source_branch: string;
    destination_branch: string;
    resource_type: ResourceType;
    resource_id: string;
    quantity: number;
    participants: string[];
    branch_urls: Record<string, string>;
  }): Promise<ITransactionDoc> {
    // Inisialisasi votes dengan null untuk setiap participant
    const votes: Record<string, null> = {};
    params.participants.forEach((p) => (votes[p] = null));

    const tx = new TransactionModel({
      ...params,
      votes,
      state: CoordinatorState.INIT,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return tx.save();
  }

  async findByTxId(txId: string): Promise<ITransactionDoc | null> {
    return TransactionModel.findOne({ tx_id: txId });
  }

  async updateState(txId: string, state: CoordinatorState): Promise<void> {
    await TransactionModel.findOneAndUpdate(
      { tx_id: txId },
      { $set: { state, updated_at: new Date() } }
    );
  }

  async setVote(txId: string, branch: string, vote: VoteValue): Promise<void> {
    await TransactionModel.findOneAndUpdate(
      { tx_id: txId },
      {
        $set: {
          [`votes.${branch}`]: vote,
          updated_at: new Date(),
        },
      }
    );
  }

  /**
   * Cari transaksi yang membutuhkan recovery saat startup
   */
  async findInProgressTransactions(): Promise<ITransactionDoc[]> {
    return TransactionModel.find({
      state: {
        $in: [
          CoordinatorState.VOTING,
          CoordinatorState.COMMITTING,
          CoordinatorState.ABORTING,
        ],
      },
    });
  }
}

export const transactionRepository = new TransactionRepository();
