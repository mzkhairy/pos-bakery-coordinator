import { Router } from 'express';
import { proxyController } from '../controllers/proxy.controller';

const router = Router();

// Proxy all GET requests for a specific branch
// Example: GET /api/proxy/jakarta/material-inventories
router.get('/:branchId/*', (req, res) => proxyController.handleProxyGet(req, res));
// Allow getting root path of branch API as well
router.get('/:branchId', (req, res) => proxyController.handleProxyGet(req, res));

export default router;
