import { elizaLogger } from '@elizaos/core';
import type { SiloMarketsResponse } from '../types/response/silo';

/**
 * Fetches market data from Silo Finance API
 */
export async function fetchSiloMarkets(): Promise<SiloMarketsResponse> {
  try {
    elizaLogger.info('[SiloService] Fetching Silo markets data');

    // Request body for Silo API
    const requestBody = {
      sort: null,
      protocolKey: null,
      isApeMode: false,
      search: null,
      isCurated: true,
    };

    const response = await fetch(
      'https://v2.silo.finance/api/display-markets-v2',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Silo markets: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as SiloMarketsResponse;
    elizaLogger.info(
      `[SiloService] Successfully fetched Silo markets: ${data.length} markets found`,
    );
    return data;
  } catch (error) {
    console.log('error', error);
    elizaLogger.error('[SiloService] Error fetching Silo markets:', error);
    throw error;
  }
}
