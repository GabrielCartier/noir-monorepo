import { elizaLogger } from '@elizaos/core';
import type { SiloVaultData } from '../types/common/silo-vault';
import type { RewardInfo, YieldData } from '../types/common/yield';
import type {
  ExtendedSiloAsset,
  ExtendedSiloMarketsResponse,
} from '../types/response/silo';

interface APYInfo {
  baseSupplyAPY: number;
  rewardsAPY: number;
  totalAPY: number;
  rewards: RewardInfo[];
}

/**
 * Calculate APY information from a Silo asset
 */
function calculateAPYInfo(asset: ExtendedSiloAsset): APYInfo {
  const rewards: RewardInfo[] = [];
  let rewardsAPY = 0;

  if (asset.collateralPrograms && asset.collateralPrograms.length > 0) {
    for (const program of asset.collateralPrograms) {
      const programData = program as {
        apr: string;
        token: { symbol: string; address: string; logoUrl?: string };
      };
      if (programData.apr && programData.token) {
        const rewardAPY = (Number.parseFloat(programData.apr) / 1e18) * 100;
        rewardsAPY += rewardAPY;

        rewards.push({
          tokenSymbol: programData.token.symbol || 'UNKNOWN',
          tokenAddress: programData.token.address || '',
          rewardAPY,
          logoUrl: programData.token.logoUrl,
        });
      }
    }
  }

  const baseSupplyAPY =
    (Number.parseFloat(asset.collateralBaseApr) / 1e18) * 100;
  const totalAPY = baseSupplyAPY + rewardsAPY;

  return {
    baseSupplyAPY,
    rewardsAPY,
    totalAPY,
    rewards,
  };
}

/**
 * Maps Silo market data to SiloVaultData format
 */
export function mapSiloToSiloVaultData(
  siloMarkets: ExtendedSiloMarketsResponse,
): SiloVaultData[] {
  if (!Array.isArray(siloMarkets) || siloMarkets.length === 0) {
    return [];
  }

  const vaultData: SiloVaultData[] = [];

  for (const market of siloMarkets) {
    try {
      // Process silo0 (collateral asset)
      if (market.silo0) {
        const silo0 = market.silo0;
        const apyInfo = calculateAPYInfo(silo0);

        vaultData.push({
          tokenAddress: silo0.tokenAddress,
          siloTokenAddress: silo0.siloTokenAddress,
          configAddress: market.configAddress,
          decimals: silo0.decimals,
          name: silo0.name,
          symbol: silo0.symbol,
          apy: {
            baseSupplyAPY: apyInfo.baseSupplyAPY,
            rewardsAPY: apyInfo.rewardsAPY,
            totalAPY: apyInfo.totalAPY,
          },
          rewards: apyInfo.rewards,
        });
      }

      // Process silo1 (debt asset)
      if (market.silo1) {
        const silo1 = market.silo1;
        const apyInfo = calculateAPYInfo(silo1);

        vaultData.push({
          tokenAddress: silo1.tokenAddress,
          siloTokenAddress: silo1.siloTokenAddress,
          configAddress: market.configAddress,
          decimals: silo1.decimals,
          name: silo1.name,
          symbol: silo1.symbol,
          apy: {
            baseSupplyAPY: apyInfo.baseSupplyAPY,
            rewardsAPY: apyInfo.rewardsAPY,
            totalAPY: apyInfo.totalAPY,
          },
          rewards: apyInfo.rewards,
        });
      }
    } catch (error) {
      elizaLogger.error(
        `[SiloMapper] Error mapping Silo market ${market.id}:`,
        error,
      );
    }
  }

  elizaLogger.info(
    `[SiloMapper] Successfully mapped ${vaultData.length} Silo vaults`,
  );
  return vaultData;
}

/**
 * Converts Silo market data to common YieldData format
 */
export function mapSiloToYieldData(
  siloMarkets: ExtendedSiloMarketsResponse,
): YieldData[] {
  if (!Array.isArray(siloMarkets) || siloMarkets.length === 0) {
    return [];
  }

  const yieldData: YieldData[] = [];

  for (const market of siloMarkets) {
    try {
      // Process silo0 (collateral asset)
      if (market.silo0) {
        const silo0 = market.silo0;
        const apyInfo = calculateAPYInfo(silo0);

        yieldData.push({
          protocolName: 'Silo Finance',
          protocolKey: market.protocolKey || 'silo',
          assetName: silo0.name,
          assetSymbol: silo0.symbol,
          assetAddress: silo0.tokenAddress,
          supplyAPY: apyInfo.baseSupplyAPY,
          rewards: apyInfo.rewards,
          totalAPY: apyInfo.totalAPY,
          borrowAPY: (Number.parseFloat(silo0.debtBaseApr) / 1e18) * 100,
          decimals: silo0.decimals,
          priceUsd: Number.parseFloat(silo0.priceUsd) / 1e6,
          logoUrl: silo0.logos?.coinGecko?.small || undefined,
          tvl: Number.parseFloat(silo0.tvl) / 10 ** silo0.decimals,
          liquidity: Number.parseFloat(silo0.liquidity) / 10 ** silo0.decimals,
          maxLTV: (Number.parseFloat(silo0.maxLtv) / 1e18) * 100,
          liquidationThreshold: (Number.parseFloat(silo0.lt) / 1e18) * 100,
          protocolData: {
            id: market.id,
            isVerified: market.isVerified,
            configAddress: market.configAddress,
            collateralPoints: silo0.collateralPoints,
            debtPoints: silo0.debtPoints,
            isNonBorrowable: silo0.isNonBorrowable,
            oracleLabel: silo0.oracleLabel,
          },
        });
      }

      // Process silo1 (debt asset)
      if (market.silo1) {
        const silo1 = market.silo1;
        const apyInfo = calculateAPYInfo(silo1);

        yieldData.push({
          protocolName: 'Silo Finance',
          protocolKey: market.protocolKey || 'silo',
          assetName: silo1.name,
          assetSymbol: silo1.symbol,
          assetAddress: silo1.tokenAddress,
          supplyAPY: apyInfo.baseSupplyAPY,
          rewards: apyInfo.rewards,
          totalAPY: apyInfo.totalAPY,
          borrowAPY: (Number.parseFloat(silo1.debtBaseApr) / 1e18) * 100,
          decimals: silo1.decimals,
          priceUsd: Number.parseFloat(silo1.priceUsd) / 1e6,
          logoUrl: silo1.logos?.coinGecko?.small || undefined,
          tvl: Number.parseFloat(silo1.tvl) / 10 ** silo1.decimals,
          liquidity: Number.parseFloat(silo1.liquidity) / 10 ** silo1.decimals,
          maxLTV: (Number.parseFloat(silo1.maxLtv) / 1e18) * 100,
          liquidationThreshold: (Number.parseFloat(silo1.lt) / 1e18) * 100,
          protocolData: {
            id: market.id,
            isVerified: market.isVerified,
            configAddress: market.configAddress,
            collateralPoints: silo1.collateralPoints,
            debtPoints: silo1.debtPoints,
            isNonBorrowable: silo1.isNonBorrowable,
            oracleLabel: silo1.oracleLabel,
          },
        });
      }
    } catch (error) {
      elizaLogger.error(
        `[SiloMapper] Error mapping Silo market ${market.id}:`,
        error,
      );
    }
  }

  elizaLogger.info(
    `[SiloMapper] Successfully mapped ${yieldData.length} Silo assets`,
  );
  return yieldData;
}
