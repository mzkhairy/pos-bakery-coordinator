import axios, { AxiosError } from 'axios';
import { getBranchUrl } from '../utils/branchRegistry';
import { logger } from '../utils/logger';

export class ProxyService {
  /**
   * Forward a GET request to a specific branch's API
   * @param branchId Target branch ID (e.g. 'jakarta')
   * @param path The path to request on the branch (e.g. '/material-inventories')
   * @param queryParams Query parameters from the original request
   * @returns Data from the branch
   */
  async proxyGetRequest(branchId: string, path: string, queryParams: any = {}): Promise<any> {
    try {
      const baseUrl = getBranchUrl(branchId);
      const url = `${baseUrl}/api${path}`;
      
      logger.info(`Proxying GET request to ${branchId}`, { url, queryParams });
      
      const response = await axios.get(url, {
        params: queryParams,
        timeout: parseInt(process.env.PROXY_TIMEOUT_MS || '5000', 10),
      });

      return response.data;
    } catch (error) {
      const err = error as AxiosError;
      logger.error(`Proxy GET request failed for ${branchId}`, { 
        path, 
        message: err.message,
        responseStatus: err.response?.status
      });
      
      throw error;
    }
  }
}

export const proxyService = new ProxyService();
