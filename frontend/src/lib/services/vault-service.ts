import type { PublicClient, WalletClient } from 'viem';
import type { Token } from '../../types/token';
import type { VaultInfo, VaultStatus } from '../../types/vault';
import { clientEnv } from '../config/client-env';
import { wrappedSonicAbi } from '../constants/abis/wrapped-sonic-abi';
import { SUPPORTED_TOKENS } from '../constants/supported-tokens';

const SONIC_TOKEN = SUPPORTED_TOKENS.find((token) => token.symbol === 'S');

if (!SONIC_TOKEN) {
  throw new Error('Sonic token not found in supported tokens');
}

// After the check, we can safely assert that SONIC_TOKEN is a Token
export const SONIC = SONIC_TOKEN as Token;

export const WRAPPED_SONIC_ADDRESS = SONIC.address;

export async function checkVaultStatus(
  walletAddress: string,
): Promise<VaultStatus> {
  try {
    const response = await fetch(
      `${clientEnv.NEXT_PUBLIC_API_URL}/vault/check`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to check vault status');
    }

    const data = await response.json();
    return {
      exists: data.exists,
      vaultAddress: data.vaultAddress,
      balance: data.balance,
    };
  } catch (error) {
    console.error('Error checking vault status:', error);
    return { exists: false };
  }
}

export async function createVault(
  walletAddress: string,
  userId: string,
): Promise<VaultInfo> {
  const response = await fetch(
    `${clientEnv.NEXT_PUBLIC_API_URL}/vault/create`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress,
        userId,
      }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create vault');
  }

  return {
    address: data.vaultAddress,
    transactionHash: data.transactionHash,
  };
}

export async function depositToVault({
  address,
  vaultAddress,
  publicClient,
  walletClient,
  amount,
}: {
  address: string;
  vaultAddress: string;
  publicClient: PublicClient;
  walletClient: WalletClient;
  amount: bigint;
}) {
  // First wrap the S tokens to self (deposit)
  const { request: depositRequest } = await publicClient.simulateContract({
    address: WRAPPED_SONIC_ADDRESS as `0x${string}`,
    abi: wrappedSonicAbi,
    functionName: 'deposit',
    value: amount,
    account: address as `0x${string}`,
  });

  const depositHash = await walletClient.writeContract({
    ...depositRequest,
    account: address as `0x${string}`,
  });

  // Wait for the deposit transaction to complete
  await publicClient.waitForTransactionReceipt({ hash: depositHash });

  // Approve the contract to spend our wrapped tokens
  const { request: approveRequest } = await publicClient.simulateContract({
    address: WRAPPED_SONIC_ADDRESS as `0x${string}`,
    abi: wrappedSonicAbi,
    functionName: 'approve',
    args: [WRAPPED_SONIC_ADDRESS as `0x${string}`, amount],
    account: address as `0x${string}`,
  });

  const approveHash = await walletClient.writeContract({
    ...approveRequest,
    account: address as `0x${string}`,
  });

  // Wait for the approval transaction to complete
  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  // Then unwrap the wrapped tokens directly to the vault address
  const { request: withdrawRequest } = await publicClient.simulateContract({
    address: WRAPPED_SONIC_ADDRESS as `0x${string}`,
    abi: wrappedSonicAbi,
    functionName: 'withdrawTo',
    args: [vaultAddress as `0x${string}`, amount],
    account: address as `0x${string}`,
  });

  const withdrawHash = await walletClient.writeContract({
    ...withdrawRequest,
    account: address as `0x${string}`,
  });

  await publicClient.waitForTransactionReceipt({ hash: withdrawHash });
}

export async function withdrawFromVault({
  address,
  vaultAddress,
  amount,
}: {
  address: string;
  vaultAddress: string;
  amount: bigint;
}): Promise<void> {
  const response = await fetch(
    `${clientEnv.NEXT_PUBLIC_API_URL}/vault/withdraw`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: address,
        vaultAddress,
        amount: amount.toString(),
      }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to withdraw from vault');
  }
}
