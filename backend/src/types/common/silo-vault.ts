/**
 * Common type for Silo vault data
 */
export interface SiloVaultData {
  tokenAddress: string;
  siloTokenAddress: string;
  configAddress: string;
  decimals: number;
  name: string;
  symbol: string;
  apy: {
    baseSupplyAPY: number;
    rewardsAPY: number;
    totalAPY: number;
  };
  rewards: Array<{
    tokenSymbol: string;
    tokenAddress: string;
    rewardAPY: number;
    logoUrl?: string;
  }>;
}
