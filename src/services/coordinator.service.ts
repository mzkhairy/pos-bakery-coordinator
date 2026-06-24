import { transactionRepository } from '../repositories/transaction.repository';
import { transactionLogRepository } from '../repositories/transactionLog.repository';
import { participantClientService } from './participantClient.service';
import { getBranchUrl } from '../utils/branchRegistry';
import { generateTxId } from '../utils/txIdGenerator';
import {
  CoordinatorState,
  LogEvent,
  ParticipantRole,
  ResourceType,
  TransactionType,
  VoteValue,
  TransferMaterialRequest,
  TransferMaterialResponse,
  AbortReason,
} from '../types';
import { logger } from '../utils/logger';
import { ITransactionDoc } from '../models';

export class CoordinatorService {
  /**
   * Entry point: jalankan full 2PC untuk transfer material
   */
  async transferMaterial(req: TransferMaterialRequest): Promise<TransferMaterialResponse> {
    const { source_branch, destination_branch, resource_id, quantity } = req;

    // Dapatkan URL cabang (throw jika tidak terkonfigurasi)
    const sourceUrl = getBranchUrl(source_branch);
    const destUrl = getBranchUrl(destination_branch);

    const tx_id = generateTxId();

    // ─── PHASE 0: Buat transaksi di DB ───────────────────────────────────────
    const tx = await transactionRepository.create({
      tx_id,
      type: TransactionType.MATERIAL_TRANSFER,
      source_branch,
      destination_branch,
      resource_type: ResourceType.MATERIAL,
      resource_id,
      quantity,
      participants: [source_branch, destination_branch],
      branch_urls: {
        [source_branch]: sourceUrl,
        [destination_branch]: destUrl,
      },
    });

    await transactionLogRepository.log(tx_id, LogEvent.TRANSACTION_CREATED, {
      source_branch,
      destination_branch,
      resource_id,
      quantity,
    });

    // Pindah ke state VOTING
    await transactionRepository.updateState(tx_id, CoordinatorState.VOTING);

    // ─── PHASE 1: Voting ─────────────────────────────────────────────────────
    await transactionLogRepository.log(tx_id, LogEvent.VOTE_REQUEST_SENT, {
      participants: [source_branch, destination_branch],
    });

    const [sourceVote, destVote] = await Promise.all([
      participantClientService.sendCanCommit({
        branchUrl: sourceUrl,
        branchId: source_branch,
        tx_id,
        resource_type: ResourceType.MATERIAL,
        resource_id,
        quantity,
        role: ParticipantRole.SOURCE,
      }),
      participantClientService.sendCanCommit({
        branchUrl: destUrl,
        branchId: destination_branch,
        tx_id,
        resource_type: ResourceType.MATERIAL,
        resource_id,
        quantity,
        role: ParticipantRole.DESTINATION,
      }),
    ]);

    // Simpan votes
    await transactionRepository.setVote(tx_id, source_branch, sourceVote.vote);
    await transactionRepository.setVote(tx_id, destination_branch, destVote.vote);

    // Log individual votes
    const sourceEvent =
      sourceVote.vote === VoteValue.YES
        ? LogEvent.PARTICIPANT_VOTED_YES
        : LogEvent.PARTICIPANT_VOTED_NO;
    const destEvent =
      destVote.vote === VoteValue.YES
        ? LogEvent.PARTICIPANT_VOTED_YES
        : LogEvent.PARTICIPANT_VOTED_NO;

    await transactionLogRepository.log(tx_id, sourceEvent, {
      branch: source_branch,
      vote: sourceVote.vote,
      reason: sourceVote.reason,
    });
    await transactionLogRepository.log(tx_id, destEvent, {
      branch: destination_branch,
      vote: destVote.vote,
      reason: destVote.reason,
    });

    await transactionLogRepository.log(tx_id, LogEvent.ALL_VOTES_RECEIVED, {
      votes: {
        [source_branch]: sourceVote.vote,
        [destination_branch]: destVote.vote,
      },
    });

    const allYes =
      sourceVote.vote === VoteValue.YES && destVote.vote === VoteValue.YES;

    // ─── PHASE 2a: COMMIT ────────────────────────────────────────────────────
    if (allYes) {
      return this._executeCommit(tx, sourceUrl, destUrl, resource_id, quantity);
    }

    // ─── PHASE 2b: ABORT ─────────────────────────────────────────────────────
    const abortReason = this._determineAbortReason(sourceVote.reason, destVote.reason);
    return this._executeAbort(tx, sourceUrl, destUrl, resource_id, quantity, abortReason, {
      [source_branch]: sourceVote.vote,
      [destination_branch]: destVote.vote,
    });
  }

  /**
   * Jalankan COMMIT phase — dipanggil saat semua vote YES
   * Juga bisa dipanggil oleh recovery service
   */
  async _executeCommit(
    tx: ITransactionDoc,
    sourceUrl: string,
    destUrl: string,
    resource_id: string,
    quantity: number
  ): Promise<TransferMaterialResponse> {
    const { tx_id, source_branch, destination_branch } = tx;

    await transactionRepository.updateState(tx_id, CoordinatorState.COMMITTING);
    await transactionLogRepository.log(tx_id, LogEvent.DECISION_COMMIT, {});

    const [sourceAck, destAck] = await Promise.all([
      participantClientService.sendDoCommit({
        branchUrl: sourceUrl,
        branchId: source_branch,
        tx_id,
        resource_id,
        quantity,
        role: ParticipantRole.SOURCE,
      }),
      participantClientService.sendDoCommit({
        branchUrl: destUrl,
        branchId: destination_branch,
        tx_id,
        resource_id,
        quantity,
        role: ParticipantRole.DESTINATION,
      }),
    ]);

    if (sourceAck.success) {
      await transactionLogRepository.log(tx_id, LogEvent.COMMIT_ACK_RECEIVED, {
        branch: source_branch,
      });
    }
    if (destAck.success) {
      await transactionLogRepository.log(tx_id, LogEvent.COMMIT_ACK_RECEIVED, {
        branch: destination_branch,
      });
    }

    await transactionRepository.updateState(tx_id, CoordinatorState.COMMITTED);
    await transactionLogRepository.log(tx_id, LogEvent.TRANSACTION_COMPLETED, {
      final_state: 'COMMITTED',
    });

    logger.info('Transaction COMMITTED', { tx_id });

    return {
      success: true,
      tx_id,
      state: CoordinatorState.COMMITTED,
      message: 'Transfer berhasil',
    };
  }

  /**
   * Jalankan ABORT phase
   * Juga bisa dipanggil oleh recovery service
   */
  async _executeAbort(
    tx: ITransactionDoc,
    sourceUrl: string,
    destUrl: string,
    resource_id: string,
    quantity: number,
    reason: string,
    votes?: Record<string, VoteValue | null>
  ): Promise<TransferMaterialResponse> {
    const { tx_id, source_branch, destination_branch } = tx;

    await transactionRepository.updateState(tx_id, CoordinatorState.ABORTING);
    await transactionLogRepository.log(tx_id, LogEvent.DECISION_ABORT, { reason });

    await Promise.all([
      participantClientService.sendDoAbort({
        branchUrl: sourceUrl,
        branchId: source_branch,
        tx_id,
        resource_id,
        quantity,
        role: ParticipantRole.SOURCE,
      }),
      participantClientService.sendDoAbort({
        branchUrl: destUrl,
        branchId: destination_branch,
        tx_id,
        resource_id,
        quantity,
        role: ParticipantRole.DESTINATION,
      }),
    ]);

    await transactionLogRepository.log(tx_id, LogEvent.ABORT_ACK_RECEIVED, {
      branches: [source_branch, destination_branch],
    });

    await transactionRepository.updateState(tx_id, CoordinatorState.ABORTED);
    await transactionLogRepository.log(tx_id, LogEvent.TRANSACTION_COMPLETED, {
      final_state: 'ABORTED',
      reason,
    });

    logger.info('Transaction ABORTED', { tx_id, reason });

    return {
      success: false,
      tx_id,
      state: CoordinatorState.ABORTED,
      message: 'Transfer dibatalkan',
      reason,
      votes,
    };
  }

  async getTransaction(txId: string): Promise<ITransactionDoc | null> {
    return transactionRepository.findByTxId(txId);
  }

  private _determineAbortReason(sourceReason?: string, destReason?: string): string {
    if (sourceReason === 'PARTICIPANT_TIMEOUT' || destReason === 'PARTICIPANT_TIMEOUT') {
      return AbortReason.PARTICIPANT_TIMEOUT;
    }
    if (sourceReason === 'INSUFFICIENT_STOCK') {
      return AbortReason.INSUFFICIENT_STOCK;
    }
    return AbortReason.PARTICIPANT_REJECTED;
  }
}

export const coordinatorService = new CoordinatorService();
