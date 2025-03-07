import { elizaLogger } from '@elizaos/core';
import {} from 'viem';
import { viemPublicClient } from '../config/viem-public-client';
import { SILO_CONFIG_ABI } from '../constants/abis/silo-config-abi';
import type {
  ExtendedSiloMarketsResponse,
  SiloMarketsResponse,
} from '../types/response/silo';

/**
 * Fetches market data from Silo Finance API and enriches it with silo token addresses
 */
export async function fetchSiloMarkets(): Promise<ExtendedSiloMarketsResponse> {
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

    // Create a Viem public client for reading contract data
    const publicClient = viemPublicClient;

    // Enrich market data with silo token addresses
    const enrichedMarkets: ExtendedSiloMarketsResponse = await Promise.all(
      data.map(async (market) => {
        const config = await publicClient.readContract({
          address: market.configAddress as `0x${string}`,
          abi: SILO_CONFIG_ABI,
          functionName: 'getSilos',
        });

        const [silo0Address, silo1Address] = config;

        return {
          ...market,
          silo0: {
            ...market.silo0,
            siloTokenAddress: silo0Address,
          },
          silo1: {
            ...market.silo1,
            siloTokenAddress: silo1Address,
          },
        };
      }),
    );

    elizaLogger.info(
      '[SiloService] Successfully enriched markets with silo token addresses',
    );
    return enrichedMarkets;
  } catch (error) {
    elizaLogger.error('[SiloService] Error fetching Silo markets:', error);
    throw error;
  }
}
