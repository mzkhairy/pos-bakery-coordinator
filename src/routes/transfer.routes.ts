import { Router } from 'express';
import { transferController } from '../controllers/transfer.controller';

const router = Router();

router.post('/transfer-material', (req, res) =>
  transferController.transferMaterial(req, res)
);

router.get('/transactions/:txId', (req, res) =>
  transferController.getTransaction(req, res)
);

export default router;
