import type { Address, PublicClient, WalletClient } from 'viem';

export interface VaultServiceParams {
  publicClient: PublicClient;
  walletClient: WalletClient;
  vaultAddress: Address;
}

export interface TokenParams extends VaultServiceParams {
  tokenAddress: Address;
  amount: bigint;
}

export interface GetVaultParams {
  publicClient: PublicClient;
  walletClient: WalletClient;
  userAddress: Address;
  vaultFactoryAddress: Address;
}

export interface VaultBalanceResponse {
  balance: bigint;
}

export interface VaultTransactionResponse {
  success: boolean;
  transactionHash?: Address;
  error?: string;
}
