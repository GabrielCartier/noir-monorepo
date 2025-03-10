import { clientEnv } from '@/src/lib/config/client-env';
import { useQuery } from '@tanstack/react-query';
import type { Address } from 'viem';
import { useAccount } from 'wagmi';

export function useCheckVaultStatus() {
  const { address } = useAccount();
  return useQuery({
    queryKey: ['vaultStatus'],
    queryFn: async () => {
      const response = await fetch(
        `${clientEnv.NEXT_PUBLIC_API_URL}/vault/check`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ walletAddress: address }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to check vault status');
      }

      const data = await response.json();
      return {
        exists: data.exists,
        vaultAddress: data.vaultAddress as Address,
        balance: data.balance,
      };
    },
    enabled: !!address,
  });
}
