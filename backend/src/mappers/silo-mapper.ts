import { elizaLogger } from '@elizaos/core';
import type { RewardInfo, YieldData } from '../types/common/yield';
import type { SiloMarketsResponse } from '../types/response/silo';

/**
 * Converts Silo market data to common YieldData format
 */
export function mapSiloToYieldData(
  siloMarkets: SiloMarketsResponse,
): YieldData[] {
  if (!Array.isArray(siloMarkets) || siloMarkets.length === 0) {
    return [];
  }

  elizaLogger.info(
    `[SiloMapper] Mapping ${siloMarkets.length} Silo markets to common format`,
  );

  const yieldData: YieldData[] = [];

  for (const market of siloMarkets) {
    try {
      // Process silo0 (collateral asset)
      if (market.silo0) {
        const silo0 = market.silo0;

        // Extract rewards from collateralPrograms and calculate total APY
        const rewards: RewardInfo[] = [];
        let rewardsAPY = 0;

        if (silo0.collateralPrograms && silo0.collateralPrograms.length > 0) {
          for (const program of silo0.collateralPrograms) {
            if (program.apr && program.token) {
              const rewardAPY = (Number.parseFloat(program.apr) / 1e18) * 100;
              rewardsAPY += rewardAPY;

              rewards.push({
                tokenSymbol: program.token.symbol || 'UNKNOWN',
                tokenAddress: program.token.address || '',
                rewardAPY,
                logoUrl: program.token.logoUrl || undefined,
              });
            }
          }
        }

        const baseSupplyAPY =
          (Number.parseFloat(silo0.collateralBaseApr) / 1e18) * 100;
        const totalAPY = baseSupplyAPY + rewardsAPY;

        yieldData.push({
          protocolName: 'Silo Finance',
          protocolKey: market.protocolKey || 'silo',
          assetName: silo0.name,
          assetSymbol: silo0.symbol,
          assetAddress: silo0.tokenAddress,
          supplyAPY: baseSupplyAPY,
          rewards,
          totalAPY,
          borrowAPY: (Number.parseFloat(silo0.debtBaseApr) / 1e18) * 100, // Convert to percentage
          decimals: silo0.decimals,
          priceUsd: Number.parseFloat(silo0.priceUsd) / 1e6, // Assuming price is in microdollars
          logoUrl: silo0.logos?.coinGecko?.small || undefined,
          tvl: Number.parseFloat(silo0.tvl) / 10 ** silo0.decimals,
          liquidity: Number.parseFloat(silo0.liquidity) / 10 ** silo0.decimals,
          maxLTV: (Number.parseFloat(silo0.maxLtv) / 1e18) * 100, // Convert to percentage
          liquidationThreshold: (Number.parseFloat(silo0.lt) / 1e18) * 100, // Convert to percentage
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

        yieldData.push({
          protocolName: 'Silo Finance',
          protocolKey: market.protocolKey || 'silo',
          assetName: silo1.name,
          assetSymbol: silo1.symbol,
          assetAddress: silo1.tokenAddress,
          supplyAPY: (Number.parseFloat(silo1.collateralBaseApr) / 1e18) * 100, // Convert to percentage
          borrowAPY: (Number.parseFloat(silo1.debtBaseApr) / 1e18) * 100, // Convert to percentage
          decimals: silo1.decimals,
          priceUsd: Number.parseFloat(silo1.priceUsd) / 1e6, // Assuming price is in microdollars
          logoUrl: silo1.logos?.coinGecko?.small || undefined,
          tvl: Number.parseFloat(silo1.tvl) / 10 ** silo1.decimals,
          liquidity: Number.parseFloat(silo1.liquidity) / 10 ** silo1.decimals,
          maxLTV: (Number.parseFloat(silo1.maxLtv) / 1e18) * 100, // Convert to percentage
          liquidationThreshold: (Number.parseFloat(silo1.lt) / 1e18) * 100, // Convert to percentage
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
