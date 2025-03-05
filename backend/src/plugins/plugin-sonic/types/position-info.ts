import type { Address } from 'viem';

export interface PositionInfo {
  siloConfigAddress: Address;
  siloAddress: Address;
  depositAmount: bigint;
  tokenSymbol: string;
  tokenDecimals: number;
}
