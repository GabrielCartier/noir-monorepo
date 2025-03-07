import type { PublicClient, WalletClient } from 'viem';

export interface VaultStatus {
  exists: boolean;
  vaultAddress?: `0x${string}`;
  balance?: string;
}

export interface VaultInfo {
  address: string;
  transactionHash: string;
}

export interface DepositDialogProps {
  address: `0x${string}`;
  vaultAddress: `0x${string}`;
  publicClient: PublicClient;
  walletClient: WalletClient;
  onDepositSuccess: () => void;
}

export interface WithdrawDialogProps {
  address: `0x${string}`;
  vaultAddress: `0x${string}`;
  maxAmount?: string;
  onWithdrawSuccess: () => void;
}
