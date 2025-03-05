import type { Address } from 'viem';

export interface TokenBalance {
  address: Address;
  balance: bigint;
}
