import type { Address } from 'viem';

export interface PositionInfo {
  siloConfigAddress: Address;
  siloAddress: Address;
  tokenAddress: Address;
  depositAmount: bigint;
  tokenSymbol: string;
  tokenDecimals: number;
}
