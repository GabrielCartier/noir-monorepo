import { SUPPORTED_TOKENS } from '@/src/lib/constants/supported-tokens';
import { type Address, formatEther } from 'viem';
import { NATIVE_TOKEN_KEY } from '../lib/constants/native-token-key';
import { useCheckBalance } from './use-check-balance';
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
  totalValueNative: number;
  totalValueNativeFormatted: string;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useUserVault(): VaultValue {
  const { data } = useCheckVaultStatus();
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
  const nativeBalance = useCheckBalance(vaultAddress);
  const refetch = () => {
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
      totalValueNative: 0,
      totalValueNativeFormatted: '$0.00',
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
  let nativeUsd = 0;
  let native = 0;
  if (nativeBalance && prices?.['0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38']) {
    nativeUsd =
      (Number(prices['0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38']?.priceUsd) ||
        0) * Number(formatEther(nativeBalance.value));
    tokens[NATIVE_TOKEN_KEY] = {
      balance: nativeBalance.value,
      balanceFormatted: formatEther(nativeBalance.value),
      valueUsd: nativeUsd,
      valueUsdFormatted: formatUsd(nativeUsd),
      symbol: 'S',
      decimals: nativeBalance.decimals,
      name: 'Sonic',
    };
    totalValueUsd += nativeUsd;
    native = Number(formatEther(nativeBalance.value));
    // We consider wrapped token like native token
    nativeUsd += tokens['0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38'].valueUsd;
    native += Number(
      tokens['0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38'].balanceFormatted,
    );
  }

  return {
    tokens,
    totalValueUsd,
    totalValueUsdFormatted: formatUsd(totalValueUsd),
    totalValueNative: native,
    totalValueNativeFormatted: formatUsd(nativeUsd),
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
