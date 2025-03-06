import type { Address } from 'viem';

export interface MessageMetadata {
  walletAddress?: Address;
  [key: string]: unknown;
}
