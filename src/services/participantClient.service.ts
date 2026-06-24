import axios, { AxiosError } from 'axios';
import { ParticipantRole, ResourceType, VoteValue } from '../types';
import { logger } from '../utils/logger';

const CAN_COMMIT_TIMEOUT = parseInt(process.env.CAN_COMMIT_TIMEOUT_MS || '5000', 10);
const DO_COMMIT_TIMEOUT = parseInt(process.env.DO_COMMIT_TIMEOUT_MS || '10000', 10);

export interface VoteResult {
  branch: string;
  vote: VoteValue;
  reason?: string;
}

export interface AckResult {
  branch: string;
  success: boolean;
  error?: string;
}

export class ParticipantClientService {
  /**
   * Kirim canCommit ke satu branch
   */
  async sendCanCommit(params: {
    branchUrl: string;
    branchId: string;
    tx_id: string;
    resource_type: ResourceType;
    resource_id: string;
    quantity: number;
    role: ParticipantRole;
  }): Promise<VoteResult> {
    const { branchUrl, branchId, ...payload } = params;

    try {
      const response = await axios.post(
        `${branchUrl}/api/2pc/can-commit`,
        payload,
        { timeout: CAN_COMMIT_TIMEOUT }
      );

      const vote = response.data.vote as VoteValue;
      logger.info(`canCommit response from ${branchId}`, { vote, tx_id: params.tx_id });

      return { branch: branchId, vote, reason: response.data.reason };
    } catch (error) {
      const axiosErr = error as AxiosError;
      const isTimeout = axiosErr.code === 'ECONNABORTED' || axiosErr.code === 'ETIMEDOUT';

      logger.warn(`canCommit failed for ${branchId}`, {
        tx_id: params.tx_id,
        reason: isTimeout ? 'TIMEOUT' : axiosErr.message,
      });

      return {
        branch: branchId,
        vote: VoteValue.NO,
        reason: isTimeout ? 'PARTICIPANT_TIMEOUT' : 'PARTICIPANT_REJECTED',
      };
    }
  }

  /**
   * Kirim doCommit ke satu branch dengan retry
   */
  async sendDoCommit(params: {
    branchUrl: string;
    branchId: string;
    tx_id: string;
    resource_id: string;
    quantity: number;
    role: ParticipantRole;
  }): Promise<AckResult> {
    return this._sendWithRetry('do-commit', params);
  }

  /**
   * Kirim doAbort ke satu branch dengan retry
   */
  async sendDoAbort(params: {
    branchUrl: string;
    branchId: string;
    tx_id: string;
    resource_id: string;
    quantity: number;
    role: ParticipantRole;
  }): Promise<AckResult> {
    return this._sendWithRetry('do-abort', params);
  }

  /**
   * Internal: HTTP POST dengan 3x retry + exponential backoff
   */
  private async _sendWithRetry(
    endpoint: 'do-commit' | 'do-abort',
    params: {
      branchUrl: string;
      branchId: string;
      tx_id: string;
      resource_id: string;
      quantity: number;
      role: ParticipantRole;
    }
  ): Promise<AckResult> {
    const { branchUrl, branchId, ...payload } = params;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await axios.post(
          `${branchUrl}/api/2pc/${endpoint}`,
          payload,
          { timeout: DO_COMMIT_TIMEOUT }
        );

        logger.info(`${endpoint} ACK from ${branchId}`, { tx_id: params.tx_id, attempt });
        return { branch: branchId, success: true };
      } catch (error) {
        const axiosErr = error as AxiosError;
        logger.warn(`${endpoint} attempt ${attempt}/${maxRetries} failed for ${branchId}`, {
          tx_id: params.tx_id,
          error: axiosErr.message,
        });

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 500; // 1s, 2s, 4s
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    logger.error(`${endpoint} failed after ${maxRetries} attempts for ${branchId}`, {
      tx_id: params.tx_id,
    });

    return {
      branch: branchId,
      success: false,
      error: `${endpoint} failed after ${maxRetries} retries`,
    };
  }
}

export const participantClientService = new ParticipantClientService();
