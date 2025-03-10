import { useAccount, useBalance } from 'wagmi';

export function useUserBalance() {
  const { address } = useAccount();
  const { data: balance } = useBalance({
    address,
  });

  return balance;
}
