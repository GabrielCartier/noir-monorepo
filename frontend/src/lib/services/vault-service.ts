import type { Address } from 'viem';
import {
  simulateContract,
  waitForTransactionReceipt,
  writeContract,
} from 'wagmi/actions';
import type { VaultInfo, VaultStatus } from '../../types/vault';
import { clientEnv } from '../config/client-env';
import { wagmiConfig } from '../config/wagmi-config';
import { wrappedSonicAbi } from '../constants/abis/wrapped-sonic-abi';

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
  address: Address;
  vaultAddress: Address;
  amount: bigint;
}) {
  const { request } = await simulateContract(wagmiConfig, {
    address: '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38',
    abi: wrappedSonicAbi,
    functionName: 'depositFor',
    args: [vaultAddress],
    value: amount,
    account: address,
  });

  const hash = await writeContract(wagmiConfig, {
    ...request,
    account: address,
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
