import { elizaLogger } from '@elizaos/core';
import { erc20Abi } from 'viem';
import { VAULT_ABI } from '../constants/vault-abi';
import { VAULT_FACTORY_ABI } from '../constants/vault-factory-abi';
import type {
  GetVaultParams,
  TokenParams,
  VaultBalanceResponse,
  VaultTransactionResponse,
} from '../types/vault-service';

/**
 * Get the balance of a specific token in the vault
 */
export async function getVaultBalance(
  params: TokenParams,
): Promise<VaultBalanceResponse> {
  const { publicClient, vaultAddress, tokenAddress } = params;

  try {
    const balance = await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [vaultAddress],
    });

    return { balance };
  } catch (error) {
    elizaLogger.error('[VaultService] Error getting vault balance:', error);
    throw error;
  }
}

/**
 * Deposit tokens into the vault
 */
export async function depositToVault(
  params: TokenParams,
): Promise<VaultTransactionResponse> {
  const { publicClient, walletClient, vaultAddress, tokenAddress, amount } =
    params;

  try {
    const { request } = await publicClient.simulateContract({
      account: walletClient.account,
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'deposit',
      args: [tokenAddress, amount],
    });

    const hash = await walletClient.writeContract(request);
    await publicClient.waitForTransactionReceipt({ hash });

    elizaLogger.info('[VaultService] Successfully deposited to vault:', {
      vaultAddress,
      tokenAddress,
      amount: amount.toString(),
      transactionHash: hash,
    });

    return {
      success: true,
      transactionHash: hash,
    };
  } catch (error) {
    elizaLogger.error('[VaultService] Error depositing to vault:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Withdraw tokens from the vault
 */
export async function withdrawFromVault(
  params: TokenParams,
): Promise<VaultTransactionResponse> {
  const { publicClient, walletClient, vaultAddress, tokenAddress, amount } =
    params;

  try {
    const { request } = await publicClient.simulateContract({
      account: walletClient.account,
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'withdraw',
      args: [tokenAddress, amount],
    });

    const hash = await walletClient.writeContract(request);
    await publicClient.waitForTransactionReceipt({ hash });

    elizaLogger.info('[VaultService] Successfully withdrawn from vault:', {
      vaultAddress,
      tokenAddress,
      amount: amount.toString(),
      transactionHash: hash,
    });

    return {
      success: true,
      transactionHash: hash,
    };
  } catch (error) {
    elizaLogger.error('[VaultService] Error withdrawing from vault:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function getVault(params: GetVaultParams) {
  const { publicClient, vaultFactoryAddress, userAddress } = params;

  try {
    const vaultAddress = await publicClient.readContract({
      address: vaultFactoryAddress,
      abi: VAULT_FACTORY_ABI,
      functionName: 'userVault',
      args: [userAddress],
    });

    return { vaultAddress };
  } catch (error) {
    elizaLogger.error('[VaultService] Error getting vault:', error);
    throw error;
  }
}
