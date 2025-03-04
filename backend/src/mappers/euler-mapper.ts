import { elizaLogger } from '@elizaos/core';
import type { RewardInfo, YieldData } from '../types/common/yield';
import type {
  EulerNativeApysResponse,
  EulerRewardsResponse,
  EulerVaultsResponse,
} from '../types/response/euler';
import { isValidEthereumAddress } from '../validators/ethereum';

/**
 * Converts Euler vault data to common YieldData format
 */
export function mapEulerToYieldData(
  eulerVaults: EulerVaultsResponse,
  eulerRewards: EulerRewardsResponse = {},
  eulerNativeApys: EulerNativeApysResponse = {},
): YieldData[] {
  if (!eulerVaults || Object.keys(eulerVaults).length === 0) {
    return [];
  }

  elizaLogger.info(
    `[EulerMapper] Mapping ${Object.keys(eulerVaults).length} Euler vaults to common format`,
  );

  const yieldData: YieldData[] = [];

  for (const [vaultAddress, vaultData] of Object.entries(eulerVaults)) {
    try {
      // Validate that vaultAddress is a valid Ethereum address
      if (!isValidEthereumAddress(vaultAddress)) {
        continue;
      }

      // Extract interest rate info
      const irmInfo = vaultData.irmInfo?.interestRateInfo?.[0];

      // Get native APY for this vault
      const nativeAPY = eulerNativeApys[vaultData.asset] || 0;

      // Extract rewards from Merkl data
      const rewards: RewardInfo[] = [];
      let lendingRewardsAPY = 0;
      let borrowingRewardsAPY = 0;

      // Get rewards for this vault from the Merkl data
      const vaultRewards = eulerRewards[vaultAddress] || [];

      // Process lending rewards
      const lendingRewards = vaultRewards.filter(
        (r) => r.type === 'euler_lend',
      );
      for (const reward of lendingRewards) {
        const rewardAPY = reward.apr;
        lendingRewardsAPY += rewardAPY;

        rewards.push({
          tokenSymbol: reward.rewardToken.symbol,
          tokenAddress: reward.rewardToken.address,
          rewardAPY,
          logoUrl: reward.rewardToken.logoURI,
        });
      }

      // Process borrowing rewards (we'll store these in the protocol data for now)
      const borrowingRewards = vaultRewards.filter(
        (r) => r.type === 'euler_borrow',
      );
      for (const reward of borrowingRewards) {
        borrowingRewardsAPY += reward.apr;
      }

      // Convert bigint strings to numbers
      const baseSupplyAPY = irmInfo
        ? Number.parseFloat(irmInfo.supplyAPY.replace('__bigint__', '')) / 1e18
        : 0;
      const borrowAPY = irmInfo
        ? Number.parseFloat(irmInfo.borrowAPY.replace('__bigint__', '')) / 1e18
        : 0;

      // Add native APY to rewards if it's greater than 0
      if (nativeAPY > 0) {
        rewards.push({
          tokenSymbol: vaultData.assetSymbol || 'UNKNOWN',
          tokenAddress: vaultData.asset,
          rewardAPY: nativeAPY,
          logoUrl: undefined, // We don't have logo URLs for native APYs
        });
      }

      // Calculate total APY (base + rewards + native)
      const totalAPY = baseSupplyAPY + lendingRewardsAPY + nativeAPY;

      // Get asset decimals
      const assetDecimals = Number.parseInt(
        vaultData.assetDecimals.replace('__bigint__', ''),
      );

      // Calculate TVL and liquidity
      const totalAssets =
        Number.parseFloat(vaultData.totalAssets.replace('__bigint__', '')) /
        10 ** assetDecimals;
      const totalBorrowed =
        Number.parseFloat(vaultData.totalBorrowed.replace('__bigint__', '')) /
        10 ** assetDecimals;

      // Get collateral LTV info
      const collateralLTVInfo = vaultData.collateralLTVInfo?.[0];
      const maxLTV = collateralLTVInfo
        ? Number.parseFloat(
            collateralLTVInfo.borrowLTV.replace('__bigint__', ''),
          ) / 100
        : undefined;
      const liquidationThreshold = collateralLTVInfo
        ? Number.parseFloat(
            collateralLTVInfo.liquidationLTV.replace('__bigint__', ''),
          ) / 100
        : undefined;

      yieldData.push({
        protocolName: 'Euler Finance',
        protocolKey: 'euler',
        assetName: vaultData.assetName || 'Unknown Asset',
        assetSymbol: vaultData.assetSymbol || 'UNKNOWN',
        assetAddress: vaultData.asset,
        supplyAPY: baseSupplyAPY,
        borrowAPY,
        rewards,
        totalAPY,
        decimals: assetDecimals,
        priceUsd: 1, // Price information not directly available in the response
        tvl: totalAssets,
        liquidity: totalAssets - totalBorrowed,
        maxLTV,
        liquidationThreshold,
        protocolData: {
          vaultAddress,
          vaultSymbol: vaultData.vaultSymbol,
          vaultName: vaultData.vaultName,
          dToken: vaultData.dToken,
          supplyCap: vaultData.supplyCap?.replace('__bigint__', ''),
          borrowCap: vaultData.borrowCap?.replace('__bigint__', ''),
          interestRateModel: vaultData.interestRateModel,
          oracle: vaultData.oracle,
          borrowingRewardsAPY,
          nativeAPY, // Store native APY in protocol data
        },
      });
    } catch (error) {
      elizaLogger.error(
        `[EulerMapper] Error mapping Euler vault ${vaultAddress}:`,
        error,
      );
    }
  }

  elizaLogger.info(
    `[EulerMapper] Successfully mapped ${yieldData.length} Euler assets`,
  );
  return yieldData;
}
