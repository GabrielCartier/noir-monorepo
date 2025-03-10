import { useAccount, useBalance } from 'wagmi';

export function useCheckBalance() {
  const { address } = useAccount();
  const { data: balance } = useBalance({
    address,
  });

  return balance;
}
