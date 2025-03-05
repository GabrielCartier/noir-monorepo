/**
 * Types for Silo Finance API responses
 */

export interface SiloOracle {
  address: string;
  oracleKey: string;
  baseToken: string | null;
  quoteToken: string | null;
  name: string | null;
}

export interface SiloPointsTag {
  _tag: string;
  multiplier: number;
}

export interface SiloBasePointsTag extends SiloPointsTag {
  basePoints: number;
}

export interface SiloAsset {
  tokenAddress: string;
  symbol: string;
  name: string;
  logos: {
    trustWallet: string | null;
    coinMarketCap: string | null;
    coinGecko: {
      small: string | null;
      large: string | null;
    } | null;
  };
  decimals: number;
  priceUsd: string;
  maxLtv: string;
  lt: string;
  solvencyOracle: SiloOracle;
  maxLtvOracle: SiloOracle;
  collateralBaseApr: string;
  collateralPrograms: unknown[];
  protectedPrograms: unknown[];
  debtBaseApr: string;
  debtPrograms: unknown[];
  liquidity: string;
  tvl: string;
  isNonBorrowable: boolean;
  collateralPoints: Array<SiloPointsTag | SiloBasePointsTag>;
  protectedPoints: Array<SiloPointsTag | SiloBasePointsTag>;
  debtPoints: SiloBasePointsTag[];
  oracleLabel: string;
  oracleContentKey: string | null;
}

export interface ExtendedSiloAsset extends SiloAsset {
  siloTokenAddress: string;
}

export interface SiloMarket {
  protocolKey: string;
  id: string;
  isVerified: boolean;
  configAddress: string;
  boostedContentKey: string | null;
  silo0: SiloAsset;
  silo1: SiloAsset;
}

export interface ExtendedSiloMarket {
  protocolKey: string;
  id: string;
  isVerified: boolean;
  configAddress: string;
  boostedContentKey: string | null;
  silo0: ExtendedSiloAsset;
  silo1: ExtendedSiloAsset;
}

export type SiloMarketsResponse = SiloMarket[];
export type ExtendedSiloMarketsResponse = ExtendedSiloMarket[];
