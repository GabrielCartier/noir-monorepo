/**
 * Represents reward information for a yield opportunity
 */
export interface RewardInfo {
  tokenSymbol: string;
  tokenAddress: string;
  rewardAPY: number;
  logoUrl?: string;
}

/**
 * Common interface for yield data across different protocols
 */
export interface YieldData {
  // Core yield information
  protocolName: string;
  protocolKey: string;
  assetName: string;
  assetSymbol: string;
  assetAddress: string;
  supplyAPY: number;
  borrowAPY?: number;

  // Rewards information
  rewards: RewardInfo[];
  totalAPY: number; // Base APY + rewards APY

  // Asset information
  decimals: number;
  priceUsd: number;
  logoUrl?: string;

  // Protocol-specific metrics
  tvl: number;
  liquidity: number;

  // Risk parameters
  maxLTV?: number;
  liquidationThreshold?: number;

  // Protocol-specific data (for deposit/withdrawal operations)
  protocolData: Record<string, unknown>;
}
