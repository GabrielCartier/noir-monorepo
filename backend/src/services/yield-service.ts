import { elizaLogger } from '@elizaos/core';
import { mapEulerToYieldData } from '../mappers/euler-mapper';
import { mapSiloToYieldData } from '../mappers/silo-mapper';
import type { YieldData } from '../types/common/yield';
import { fetchEulerData } from './euler-service';
import { fetchSiloMarkets } from './silo-service';

/**
 * Fetches yield data from all supported protocols
 */
export async function fetchAllYields(): Promise<YieldData[]> {
  elizaLogger.info('[YieldService] Fetching yields from all sources');

  try {
    // Fetch data from all sources in parallel
    const [siloData, eulerData] = await Promise.all([
      fetchSiloMarkets().catch((error) => {
        elizaLogger.error('[YieldService] Error fetching Silo data:', error);
        return [];
      }),
      fetchEulerData().catch((error) => {
        elizaLogger.error('[YieldService] Error fetching Euler data:', error);
        return { vaults: {}, rewards: {}, nativeApys: {} };
      }),
    ]);

    // Map data to common format
    const siloYields = mapSiloToYieldData(siloData);
    const eulerYields = mapEulerToYieldData(
      eulerData.vaults,
      eulerData.rewards,
      eulerData.nativeApys,
    );

    // Combine all yields
    const allYields = [...siloYields, ...eulerYields];

    elizaLogger.info(
      `[YieldService] Successfully fetched ${allYields.length} yields from all sources`,
    );
    return allYields;
  } catch (error) {
    elizaLogger.error('[YieldService] Error fetching all yields:', error);
    throw error;
  }
}

/**
 * Filters and sorts yield data based on request parameters
 */
export function filterAndSortYields(
  yields: YieldData[],
  filters: {
    protocols?: string[];
    minSupplyAPY?: number;
    maxBorrowAPY?: number;
    minTVL?: number;
    minTotalAPY?: number;
    sortBy?: 'supplyAPY' | 'borrowAPY' | 'tvl' | 'liquidity' | 'totalAPY';
    sortDirection?: 'asc' | 'desc';
  },
): YieldData[] {
  let filteredYields = [...yields];

  // Apply filters
  if (filters.protocols && filters.protocols.length > 0) {
    filteredYields = filteredYields.filter((y) =>
      filters.protocols.includes(y.protocolKey.toLowerCase()),
    );
  }

  if (filters.minSupplyAPY) {
    filteredYields = filteredYields.filter(
      (y) => y.supplyAPY >= filters.minSupplyAPY,
    );
  }

  if (filters.maxBorrowAPY) {
    filteredYields = filteredYields.filter(
      (y) => y.borrowAPY === undefined || y.borrowAPY <= filters.maxBorrowAPY,
    );
  }

  if (filters.minTVL) {
    filteredYields = filteredYields.filter((y) => y.tvl >= filters.minTVL);
  }

  if (filters.minTotalAPY) {
    filteredYields = filteredYields.filter(
      (y) => y.totalAPY >= filters.minTotalAPY,
    );
  }

  // Apply sorting
  if (filters.sortBy) {
    filteredYields.sort((a, b) => {
      const aValue = a[filters.sortBy] ?? 0;
      const bValue = b[filters.sortBy] ?? 0;

      return filters.sortDirection === 'asc'
        ? aValue - bValue
        : bValue - aValue;
    });
  }

  return filteredYields;
}
