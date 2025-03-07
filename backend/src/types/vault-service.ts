import type { Address, PublicClient, WalletClient } from 'viem';

export interface VaultServiceParams {
  publicClient: PublicClient;
  walletClient: WalletClient;
  vaultAddress: Address;
}

export interface TokenParams {
  publicClient: PublicClient;
  walletClient: WalletClient;
  vaultAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
  amount: bigint;
}

export interface WithdrawParams extends TokenParams {
  userAddress: `0x${string}`;
}

export interface GetVaultParams {
  publicClient: PublicClient;
  walletClient: WalletClient;
  vaultFactoryAddress: `0x${string}`;
  userAddress: `0x${string}`;
}

export interface VaultBalanceResponse {
  balance: bigint;
}

export interface VaultTransactionResponse {
  success: boolean;
  transactionHash?: string;
  error?: string;
}
