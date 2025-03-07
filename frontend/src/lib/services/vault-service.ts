import { erc20Abi } from 'viem';
import type { Token } from '../../types/token';
import type {
  VaultInfo,
  VaultOperationParams,
  VaultStatus,
} from '../../types/vault';
import { clientEnv } from '../config/client-env';
import { VAULT_ABI } from '../constants/abis/vault-abi';
import { SUPPORTED_TOKENS } from '../constants/supported-tokens';

const SONIC_TOKEN = SUPPORTED_TOKENS.find((token) => token.symbol === 'S');

if (!SONIC_TOKEN) {
  throw new Error('Sonic token not found in supported tokens');
}

// After the check, we can safely assert that SONIC_TOKEN is a Token
export const SONIC = SONIC_TOKEN as Token;

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
  publicClient,
  walletClient,
  vaultAddress,
  amount = BigInt(1e18), // Default to 1 Sonic token if not specified
}: VaultOperationParams): Promise<void> {
  // Check current allowance
  const currentAllowance = await publicClient.readContract({
    address: SONIC.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address, vaultAddress],
  });

  // If allowance is insufficient, request approval
  if (currentAllowance < amount) {
    const { request: approveRequest } = await publicClient.simulateContract({
      account: address,
      address: SONIC.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'approve',
      args: [vaultAddress, amount],
    });

    const approveHash = await walletClient.writeContract(approveRequest);
    const approveReceipt = await publicClient.waitForTransactionReceipt({
      hash: approveHash,
      confirmations: 1,
    });

    if (approveReceipt.status === 'reverted') {
      throw new Error('Token approval failed');
    }
  }

  // Now deposit into the vault
  const { request: depositRequest } = await publicClient.simulateContract({
    account: address,
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'deposit',
    args: [SONIC.address as `0x${string}`, amount],
  });

  const depositHash = await walletClient.writeContract(depositRequest);
  const depositReceipt = await publicClient.waitForTransactionReceipt({
    hash: depositHash,
    confirmations: 1,
  });

  if (depositReceipt.status === 'reverted') {
    throw new Error('Deposit transaction failed');
  }
}

export async function withdrawFromVault({
  address,
  publicClient,
  walletClient,
  vaultAddress,
  amount = BigInt(1e18), // Default to 1 Sonic token if not specified
}: VaultOperationParams): Promise<void> {
  const { request } = await publicClient.simulateContract({
    account: address,
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'withdraw',
    args: [SONIC.address as `0x${string}`, amount],
  });

  const hash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    confirmations: 1,
  });

  if (receipt.status === 'reverted') {
    throw new Error('Withdrawal transaction failed');
  }
}
