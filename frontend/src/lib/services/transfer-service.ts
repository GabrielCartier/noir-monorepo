import type { Address } from 'viem';
import { erc20Abi } from 'viem';
import {
  readContract,
  simulateContract,
  waitForTransactionReceipt,
  writeContract,
} from 'wagmi/actions';
import type { Token } from '../../types/token';
import { wagmiConfig } from '../config/wagmi-config';
import { SUPPORTED_TOKENS } from '../constants/supported-tokens';
import { checkVaultStatus } from './vault-service';

// TODO Should use the hook instead.
export async function getTokenBalances(
  address: Address,
): Promise<{ token: Token; balance: bigint }[]> {
  const balances = await Promise.all(
    SUPPORTED_TOKENS.map(async (token) => {
      try {
        const balance = await readContract(wagmiConfig, {
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
}: {
  token: Token;
  amount: bigint;
  from: Address;
  to: Address;
}): Promise<{
  hash: string;
  updatedVaultStatus: {
    exists: boolean;
    vaultAddress?: string;
    balance?: bigint;
  };
}> {
  const { request } = await simulateContract(wagmiConfig, {
    address: token.address,
    abi: erc20Abi,
    functionName: 'transfer',
    args: [to, amount],
    account: from,
  });

  const hash = await writeContract(wagmiConfig, {
    ...request,
    account: from,
  });

  // Wait for transaction to be mined
  await waitForTransactionReceipt(wagmiConfig, { hash });

  // Update vault balance
  const vaultStatus = await checkVaultStatus(from);
  const updatedVaultStatus = {
    exists: vaultStatus.exists,
    vaultAddress: vaultStatus.vaultAddress,
    balance: vaultStatus.balance ? BigInt(vaultStatus.balance) : undefined,
  };

  return { hash, updatedVaultStatus };
}
