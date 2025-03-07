import type { PublicClient, WalletClient } from 'viem';

export interface VaultStatus {
  exists: boolean;
  vaultAddress?: string;
  balance?: string;
}

export interface VaultInfo {
  address: string;
  transactionHash: string;
}

export interface VaultOperationParams {
  address: `0x${string}`;
  publicClient: PublicClient;
  walletClient: WalletClient;
  vaultAddress: `0x${string}`;
  amount?: bigint;
}

export interface DepositDialogProps {
  address: `0x${string}`;
  vaultAddress: `0x${string}`;
  publicClient: PublicClient;
  walletClient: WalletClient;
  onDepositSuccess: () => void;
}
