import { Router } from 'express';
import { transferController } from '../controllers/transfer.controller';

const router = Router();

router.post('/transfer-material', (req, res) =>
  transferController.transferMaterial(req, res)
);

router.get('/transactions/:txId', (req, res) =>
  transferController.getTransaction(req, res)
);

// Decision endpoint untuk participant recovery
router.get('/2pc/decision/:txId', (req, res) =>
  transferController.getDecisionForParticipant(req, res)
);

export default router;
