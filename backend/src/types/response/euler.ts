/**
 * Types for Euler Finance API responses
 */

export interface EulerOracle {
  name: string;
  oracle: string;
  oracleInfo: string;
}

export interface EulerPriceInfo {
  amountOutBid: string;
  amountOutAsk: string;
  oracle: string;
  asset: string;
  amountOutMid: string;
  unitOfAccount: string;
  amountIn: string;
  queryFailure: boolean;
  queryFailureReason: string;
  timestamp: string;
}

export interface EulerCollateralLTVInfo {
  targetTimestamp: string;
  borrowLTV: string;
  collateral: string;
  initialLiquidationLTV: string;
  liquidationLTV: string;
  rampDuration: string;
}

export interface EulerInterestRateInfo {
  borrowSPY: string;
  borrowAPY: string;
  supplyAPY: string;
  cash: string;
  borrows: string;
}

export interface EulerInterestRateModelInfo {
  interestRateModelType: number;
  interestRateModelParams: string;
  interestRateModel: string;
}

export interface EulerIRMInfo {
  queryFailure: boolean;
  queryFailureReason: string;
  vault: string;
  interestRateModel: string;
  interestRateInfo: EulerInterestRateInfo[];
  interestRateModelInfo: EulerInterestRateModelInfo;
}

export interface EulerVault {
  baseOracle: {
    baseVault: string;
    names: string[];
    oracles: Record<string, any[]>;
  };
  totalAssets: string;
  collateralLTVInfo: EulerCollateralLTVInfo[];
  assetName: string;
  backupAssetOracleInfo: EulerOracle;
  backupAssetPriceInfo: EulerPriceInfo;
  borrowCap: string;
  collateralPriceInfo: EulerPriceInfo[];
  creator: string;
  evc: string;
  accumulatedFeesShares: string;
  timestamp: string;
  vaultName: string;
  hookedOperations: string;
  balanceTracker: string;
  interestRateModel: string;
  liabilityPriceInfo: EulerPriceInfo;
  liquidationCoolOffTime: string;
  unitOfAccount: string;
  assetSymbol: string;
  irmInfo: EulerIRMInfo;
  nameOverride: boolean;
  oracle: string;
  protocolConfig: string;
  totalCash: string;
  totalShares: string;
  unitOfAccountSymbol: string;
  dToken: string;
  oracleInfo: EulerOracle;
  unitOfAccountDecimals: string;
  unitOfAccountName: string;
  vaultSymbol: string;
  assetMeta: Record<string, unknown>;
  interestFee: string;
  assetDecimals: string;
  totalBorrowed: string;
  asset: string;
  supplyCap: string;
}

export type EulerVaultsResponse = Record<string, EulerVault>;

// Merkl rewards types
export interface EulerRewardToken {
  address: string;
  name: string;
  decimals: number;
  symbol: string;
  hasPermit: boolean;
  useInSwap: boolean;
  logoURI: string;
}

export interface EulerRewardProgram {
  id: string;
  chainId: number;
  vault: string;
  apr: number;
  startTimestamp: number;
  endTimestamp: number;
  type: string; // 'euler_lend' | 'euler_borrow'
  rewardToken: EulerRewardToken;
  tokenPrice: number;
  amount: string;
}

export type EulerRewardsResponse = Record<string, EulerRewardProgram[]>;

// Native APYs response
export interface EulerNativeApysResponse {
  [vaultAddress: string]: number;
}
