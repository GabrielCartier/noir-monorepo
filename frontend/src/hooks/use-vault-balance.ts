import { SUPPORTED_TOKENS } from '@/src/lib/constants/supported-tokens';
import { type Address, erc20Abi } from 'viem';
import { useReadContracts } from 'wagmi';

// TODO Rename
export function useVaultBalance(vaultAddress: Address | undefined) {
  const contracts = SUPPORTED_TOKENS.map((token) => ({
    address: token.address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [vaultAddress],
  }));

  const { data, isLoading, isError, refetch } = useReadContracts({
    contracts,
    query: {
      refetchInterval: 5000,
      enabled: !!vaultAddress,
    },
  });

  // Convert array of results to Record<Address, bigint>
  const balances = data?.reduce<Record<Address, bigint>>(
    (acc, balance, index) => {
      if (balance.status === 'success') {
        acc[SUPPORTED_TOKENS[index].address as Address] =
          balance.result as bigint;
      }
      return acc;
    },
    {},
  );

  return {
    data: balances || {},
    isLoading,
    isError,
    refetch,
  };
}
