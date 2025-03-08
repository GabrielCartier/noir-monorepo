import type { PublicClient, WalletClient } from 'viem';
import { erc20Abi } from 'viem';
import type { Token } from '../../types/token';
import { SUPPORTED_TOKENS } from '../constants/supported-tokens';
import { checkVaultStatus } from './vault-service';

export async function getTokenBalances(
  address: string,
  publicClient: PublicClient,
): Promise<{ token: Token; balance: bigint }[]> {
  const balances = await Promise.all(
    SUPPORTED_TOKENS.map(async (token) => {
      try {
        const balance = await publicClient.readContract({
          address: token.address as `0x${string}`,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
        });
        return { token, balance };
      } catch (error) {
        console.error(`Error fetching balance for ${token.symbol}:`, error);
        return { token, balance: 0n };
      }
    }),
  );

  return balances;
}

export async function transferToken({
  token,
  amount,
  from,
  to,
  publicClient,
  walletClient,
}: {
  token: Token;
  amount: bigint;
  from: string;
  to: string;
  publicClient: PublicClient;
  walletClient: WalletClient;
}): Promise<{
  hash: string;
  updatedVaultStatus: {
    exists: boolean;
    vaultAddress?: string;
    balance?: bigint;
  };
}> {
  const { request } = await publicClient.simulateContract({
    address: token.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'transfer',
    args: [to as `0x${string}`, amount],
    account: from as `0x${string}`,
  });

  const hash = await walletClient.writeContract(request);

  // Wait for transaction to be mined
  await publicClient.waitForTransactionReceipt({ hash });

  // Update vault balance
  const vaultStatus = await checkVaultStatus(from);
  const updatedVaultStatus = {
    exists: vaultStatus.exists,
    vaultAddress: vaultStatus.vaultAddress,
    balance: vaultStatus.balance ? BigInt(vaultStatus.balance) : undefined,
  };

  return { hash, updatedVaultStatus };
}
