import { Request, Response } from 'express';
import { proxyService } from '../services/proxy.service';
import { logger } from '../utils/logger';
import { AxiosError } from 'axios';

export class ProxyController {
  /**
   * Handle GET requests to be proxied to a branch
   */
  async handleProxyGet(req: Request, res: Response): Promise<void> {
    try {
      const { branchId } = req.params;
      
      // req.params[0] captures the wildcard part of the route (e.g., if route is /branch/:branchId/*)
      const path = '/' + (req.params[0] || '');

      if (!branchId) {
        res.status(400).json({ error: 'Missing branchId parameter' });
        return;
      }

      const data = await proxyService.proxyGetRequest(branchId, path, req.query);
      res.status(200).json(data);
    } catch (error) {
      const err = error as AxiosError;
      logger.error('handleProxyGet error', { message: err.message, path: req.path });
      
      if (err.message.includes('Branch URL not found')) {
        res.status(404).json({ error: err.message });
        return;
      }

      if (err.response) {
        // Forward the status code and data from the branch if available
        res.status(err.response.status).json(err.response.data);
      } else {
        res.status(500).json({ error: 'Internal server error while proxying request', message: err.message });
      }
    }
  }
}

export const proxyController = new ProxyController();
