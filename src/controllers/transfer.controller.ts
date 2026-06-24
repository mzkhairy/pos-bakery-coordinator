import { Request, Response } from 'express';
import { coordinatorService } from '../services/coordinator.service';
import { TransferMaterialRequest } from '../types';
import { logger } from '../utils/logger';

export class TransferController {
  /**
   * POST /api/transfer-material
   */
  async transferMaterial(req: Request, res: Response): Promise<void> {
    try {
      const { source_branch, destination_branch, resource_id, quantity } =
        req.body as TransferMaterialRequest;

      // Validasi dasar
      if (!source_branch || !destination_branch || !resource_id || quantity === undefined) {
        res.status(400).json({
          error: 'Missing required fields: source_branch, destination_branch, resource_id, quantity',
        });
        return;
      }

      if (quantity <= 0) {
        res.status(400).json({ error: 'quantity must be greater than 0' });
        return;
      }

      if (source_branch === destination_branch) {
        res.status(400).json({ error: 'source_branch and destination_branch must be different' });
        return;
      }

      const result = await coordinatorService.transferMaterial({
        source_branch,
        destination_branch,
        resource_id,
        quantity,
      });

      res.status(200).json(result);
    } catch (error) {
      const err = error as Error;
      logger.error('transferMaterial error', { message: err.message });

      if (err.message.includes('Branch URL not found')) {
        res.status(400).json({ error: err.message });
        return;
      }

      res.status(500).json({ error: 'Internal server error', message: err.message });
    }
  }

  /**
   * GET /api/transactions/:txId
   */
  async getTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { txId } = req.params;
      const tx = await coordinatorService.getTransaction(txId);

      if (!tx) {
        res.status(404).json({ error: `Transaction not found: ${txId}` });
        return;
      }

      res.status(200).json(tx);
    } catch (error) {
      logger.error('getTransaction error', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const transferController = new TransferController();
