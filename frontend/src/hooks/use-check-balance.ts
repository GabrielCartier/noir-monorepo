import type { Address } from 'viem';
import { useBalance } from 'wagmi';

export function useCheckBalance(address: Address | undefined) {
  const { data: balance } = useBalance({
    address,
  });

  return balance;
}
