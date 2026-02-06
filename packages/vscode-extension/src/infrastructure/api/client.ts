/**
 * API client using openapi-fetch
 * Types are generated from openapi.yaml - run `pnpm generate:api` to update
 */

import createClient from 'openapi-fetch';
import type { paths } from './generated';
import { getApiUrl } from '@/shared/config';
import { logger } from '@/shared/logger';
import { NetworkError } from '@/shared/errors';

let getAuthToken: () => Promise<string | undefined> = async () => undefined;
let refreshTokenHandler: () => Promise<boolean> = async () => false;

export function setAuthTokenProvider(provider: () => Promise<string | undefined>): void {
  getAuthToken = provider;
}

export function setRefreshTokenHandler(handler: () => Promise<boolean>): void {
  refreshTokenHandler = handler;
}

function createApiClient() {
  return createClient<paths>({
    baseUrl: getApiUrl(),
    fetch: async (request) => {
      const token = await getAuthToken();

      if (token) {
        request.headers.set('authorization', `Bearer ${token}`);
      }

      logger.debug(`API request: ${request.method} ${request.url}`);

      try {
        let response = await fetch(request);

        // Handle 401 - attempt token refresh
        if (response.status === 401) {
          logger.info('Received 401, attempting token refresh');
          const refreshed = await refreshTokenHandler();

          if (refreshed) {
            logger.info('Token refreshed, retrying request');
            const newToken = await getAuthToken();
            if (newToken) {
              request.headers.set('authorization', `Bearer ${newToken}`);
            }
            response = await fetch(request.clone());
          }
        }

        return response;
      } catch (error) {
        logger.error('API network error', error);
        const message = error instanceof Error ? error.message : String(error);
        throw new NetworkError(`Failed to connect to WatchAPI server: ${message}`);
      }
    },
  });
}

export const api = createApiClient();
