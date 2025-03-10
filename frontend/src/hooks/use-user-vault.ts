import { SUPPORTED_TOKENS } from '@/src/lib/constants/supported-tokens';
import type { Address } from 'viem';
import { useCheckVaultStatus } from './use-check-vault-status';
import { useTokenPrices } from './use-token-prices';
import { useVaultBalance } from './use-vault-balance';

export interface TokenValue {
  balance: bigint;
  balanceFormatted: string;
  valueUsd: number;
  valueUsdFormatted: string;
  symbol: string;
  decimals: number;
  name: string;
}

export interface VaultValue {
  tokens: Record<Address, TokenValue>;
  totalValueUsd: number;
  totalValueUsdFormatted: string;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useUserVault(): VaultValue {
  const { data, refetch: refetchVaultStatus } = useCheckVaultStatus();
  const vaultAddress = data?.vaultAddress;
  const {
    data: balances,
    isLoading: isLoadingBalances,
    isError: isErrorBalances,
    refetch: refetchBalances,
  } = useVaultBalance(vaultAddress);
  const {
    data: prices,
    isLoading: isLoadingPrices,
    isError: isErrorPrices,
    refetch: refetchPrices,
  } = useTokenPrices();

  const refetch = () => {
    refetchVaultStatus();
    refetchBalances();
    refetchPrices();
  };
  const isLoading = isLoadingBalances || isLoadingPrices;
  const isError = isErrorBalances || isErrorPrices;

  // If loading or error, return empty state
  if (isLoading || isError || !balances || !prices) {
    return {
      tokens: {},
      totalValueUsd: 0,
      totalValueUsdFormatted: '$0.00',
      isLoading,
      isError,
      refetch,
    };
  }

  const tokens: Record<Address, TokenValue> = {};
  let totalValueUsd = 0;

  // Process each supported token
  for (const token of SUPPORTED_TOKENS) {
    const balance = balances[token.address as Address] || 0n;
    const price = prices[token.address as Address];

    // Skip if no balance
    if (balance === 0n) {
      continue;
    }

    // Calculate formatted balance using token decimals
    const balanceFormatted = formatBalance(balance, token.decimals);

    // Calculate USD value
    const valueUsd = price
      ? Number(price.priceUsd) * Number(balanceFormatted)
      : 0;

    if (valueUsd > 0) {
      tokens[token.address as Address] = {
        balance,
        balanceFormatted,
        valueUsd,
        valueUsdFormatted: formatUsd(valueUsd),
        symbol: token.symbol,
        decimals: token.decimals,
        name: token.name,
      };

      totalValueUsd += valueUsd;
    }
  }

  return {
    tokens,
    totalValueUsd,
    totalValueUsdFormatted: formatUsd(totalValueUsd),
    isLoading,
    isError,
    refetch,
  };
}

// Helper function to format balance with proper decimals
function formatBalance(balance: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const integerPart = balance / divisor;
  const fractionalPart = balance % divisor;

  // Pad the fractional part with leading zeros if needed
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');

  return `${integerPart}.${fractionalStr}`;
}

// Helper function to format USD values
function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
