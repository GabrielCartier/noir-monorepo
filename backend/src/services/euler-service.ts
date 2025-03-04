import { elizaLogger } from '@elizaos/core';
import type {
  EulerNativeApysResponse,
  EulerRewardsResponse,
  EulerVaultsResponse,
} from '../types/response/euler';

/**
 * Fetches vault data from Euler Finance API
 */
export async function fetchEulerVaults(): Promise<EulerVaultsResponse> {
  try {
    elizaLogger.info('[EulerService] Fetching Euler vaults data');
    const response = await fetch(
      'https://app.euler.finance/api/v1/vault?chainId=146',
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Euler vaults: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as EulerVaultsResponse;
    elizaLogger.info(
      `[EulerService] Successfully fetched Euler vaults: ${Object.keys(data).length} vaults found`,
    );
    return data;
  } catch (error) {
    elizaLogger.error('[EulerService] Error fetching Euler vaults:', error);
    throw error;
  }
}

/**
 * Fetches rewards data from Euler Finance Merkl API
 */
export async function fetchEulerRewards(): Promise<EulerRewardsResponse> {
  try {
    elizaLogger.info('[EulerService] Fetching Euler rewards data');
    const response = await fetch(
      'https://app.euler.finance/api/v1/rewards/merkl?chainId=146',
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Euler rewards: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as EulerRewardsResponse;
    elizaLogger.info(
      `[EulerService] Successfully fetched Euler rewards for ${Object.keys(data).length} vaults`,
    );
    return data;
  } catch (error) {
    elizaLogger.error('[EulerService] Error fetching Euler rewards:', error);
    throw error;
  }
}

/**
 * Fetches native APY data for underlying tokens
 */
export async function fetchEulerNativeApys(): Promise<EulerNativeApysResponse> {
  try {
    elizaLogger.info('[EulerService] Fetching Euler native APYs data');
    const response = await fetch(
      'https://app.euler.finance/api/v1/native-apys?chainId=146',
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Euler native APYs: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as EulerNativeApysResponse;
    elizaLogger.info(
      `[EulerService] Successfully fetched Euler native APYs for ${
        Object.keys(data).length - 3
      } assets`, // Subtract 3 for the non-APY fields
    );
    return data;
  } catch (error) {
    elizaLogger.error(
      '[EulerService] Error fetching Euler native APYs:',
      error,
    );
    throw error;
  }
}

/**
 * Fetches all data from Euler Finance
 */
export async function fetchEulerData(): Promise<{
  vaults: EulerVaultsResponse;
  rewards: EulerRewardsResponse;
  nativeApys: EulerNativeApysResponse;
}> {
  const [vaults, rewards, nativeApys] = await Promise.all([
    fetchEulerVaults(),
    fetchEulerRewards(),
    fetchEulerNativeApys(),
  ]);

  return { vaults, rewards, nativeApys };
}
