import {
  simulateContract,
  waitForTransactionReceipt,
  writeContract,
} from 'wagmi/actions';
import type { Token } from '../../types/token';
import type { VaultInfo, VaultStatus } from '../../types/vault';
import { clientEnv } from '../config/client-env';
import { wagmiConfig } from '../config/wagmi-config';
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

export async function depositForVault({
  address,
  vaultAddress,
  amount,
}: {
  address: string;
  vaultAddress: string;
  amount: bigint;
}) {
  const { request } = await simulateContract(wagmiConfig, {
    address: WRAPPED_SONIC_ADDRESS as `0x${string}`,
    abi: wrappedSonicAbi,
    functionName: 'depositFor',
    args: [vaultAddress as `0x${string}`],
    value: amount,
    account: address as `0x${string}`,
  });

  const hash = await writeContract(wagmiConfig, {
    ...request,
    account: address as `0x${string}`,
  });

  await waitForTransactionReceipt(wagmiConfig, { hash });
  return hash;
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
