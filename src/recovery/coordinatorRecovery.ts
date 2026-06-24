import axios from 'axios';
import { transactionRepository } from '../repositories/transaction.repository';
import { transactionLogRepository } from '../repositories/transactionLog.repository';
import { coordinatorService } from '../services/coordinator.service';
import { getBranchUrl } from '../utils/branchRegistry';
import { CoordinatorState, LogEvent, ResourceType } from '../types';
import { logger } from '../utils/logger';
import { ITransactionDoc } from '../models';

export async function runCoordinatorRecovery(): Promise<void> {
  logger.info('Starting coordinator recovery scan...');

  const pendingTxs = await transactionRepository.findInProgressTransactions();

  if (pendingTxs.length === 0) {
    logger.info('No pending transactions found. Recovery complete.');
    return;
  }

  logger.warn(`Found ${pendingTxs.length} pending transaction(s). Recovering...`);

  for (const tx of pendingTxs) {
    await recoverTransaction(tx);
  }

  logger.info('Coordinator recovery complete.');
}

async function recoverTransaction(tx: ITransactionDoc): Promise<void> {
  const { tx_id, state, source_branch, destination_branch, resource_id, quantity } = tx;

  logger.info(`Recovering transaction ${tx_id} — state: ${state}`);

  await transactionLogRepository.log(tx_id, LogEvent.RECOVERY_INITIATED, {
    recovered_from_state: state,
  });

  let sourceUrl: string;
  let destUrl: string;

  try {
    // Ambil URL dari branch_urls yang tersimpan di transaksi (penting untuk recovery)
    const branchUrls = tx.branch_urls as Map<string, string>;
    sourceUrl = branchUrls.get(source_branch) ?? getBranchUrl(source_branch);
    destUrl = branchUrls.get(destination_branch) ?? getBranchUrl(destination_branch);
  } catch (err) {
    logger.error(`Cannot recover ${tx_id} — branch URL unknown`, { err });
    return;
  }

  switch (state) {
    case CoordinatorState.VOTING:
      // Votes mungkin tidak lengkap. Karena kita tidak bisa tahu siapa yang belum vote,
      // keputusan aman adalah ABORT.
      logger.warn(`Transaction ${tx_id} stuck at VOTING — forcing ABORT`);
      await coordinatorService._executeAbort(
        tx,
        sourceUrl,
        destUrl,
        resource_id,
        quantity,
        'RECOVERY_FORCED_ABORT'
      );
      break;

    case CoordinatorState.COMMITTING:
      // Semua votes sudah YES, kita hanya perlu menyelesaikan commit
      logger.info(`Transaction ${tx_id} stuck at COMMITTING — resuming commit`);
      await coordinatorService._executeCommit(tx, sourceUrl, destUrl, resource_id, quantity);
      break;

    case CoordinatorState.ABORTING:
      // Keputusan abort sudah dibuat, kita hanya perlu memastikan semua participant abort
      logger.info(`Transaction ${tx_id} stuck at ABORTING — resuming abort`);
      await coordinatorService._executeAbort(
        tx,
        sourceUrl,
        destUrl,
        resource_id,
        quantity,
        'RECOVERY_RESUME_ABORT'
      );
      break;

    default:
      logger.warn(`Transaction ${tx_id} has unexpected state for recovery: ${state}`);
  }
}
