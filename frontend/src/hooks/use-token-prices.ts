import { clientEnv } from '@/src/lib/config/client-env';
import { useQuery } from '@tanstack/react-query';
import type { Address } from 'viem';
import { useChainId } from 'wagmi';
import { SUPPORTED_TOKENS } from '../lib/constants/supported-tokens';

export interface TokenPrice {
  priceNative: string;
  priceUsd: string;
  symbol: string;
}

/**
 * Hook to fetch token prices from the API
 * @returns Object containing token prices indexed by token address
 */
export function useTokenPrices() {
  const chainId = useChainId();
  const tokenAddresses = SUPPORTED_TOKENS.map((token) => token.address);
  return useQuery<Record<Address, TokenPrice | undefined>>({
    queryKey: ['tokenPrices'],
    queryFn: async () => {
      const response = await fetch(
        `${clientEnv.NEXT_PUBLIC_API_URL}/tokens/prices`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tokenAddresses, chainId }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch token prices');
      }

      return response.json();
    },
    // Refresh every 30 seconds
    refetchInterval: 30_000,
    // Keep data fresh for 1 minute
    staleTime: 60_000,
  });
}
