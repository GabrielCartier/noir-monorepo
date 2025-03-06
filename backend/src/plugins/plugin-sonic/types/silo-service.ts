import type { Address, PublicClient, WalletClient } from 'viem';

// TODO Might need to add more params here
export interface BaseParams {
  publicClient: PublicClient;
  walletClient: WalletClient;
  siloAddress: Address;
  vaultAddress: Address;
}
export interface DepositParams extends BaseParams {
  tokenAddress: Address;
  amount: bigint;
}

export interface WithdrawParams extends BaseParams {
  shares: bigint;
}

export interface PositionInfo {
  shares: bigint;
  amount: bigint;
}

export interface TransactionResponse {
  success: boolean;
  transactionHash?: string;
  error?: string;
}
