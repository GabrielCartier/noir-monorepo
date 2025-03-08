'use client';

import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { clientEnv } from '@/src/lib/config/client-env';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { erc20Abi } from 'viem';
import { SUPPORTED_TOKENS } from '../../lib/constants/supported-tokens';
import type { VaultStatus } from '../../types/vault';
import { useWallet } from '../providers/wallet-provider';
import { CreateVaultDialog } from './create-vault-dialog';
import { DepositDialog } from './deposit-dialog';
import { PortfolioDialog } from './portfolio-dialog';
import { WithdrawDialog } from './withdraw-dialog';

const NATIVE_TOKEN_KEY = 'native_s' as const;

interface TokenPrice {
  priceNative: string;
  priceUsd: string;
  symbol: string;
}

interface PortfolioValue {
  totalValueInS: bigint;
  totalValueInUsd: number;
  tokenBalances: {
    [address: string]: {
      balance: bigint;
      valueInS: bigint;
      valueInUsd: number;
      symbol: string;
    };
  };
}

export function VaultValue() {
  const { address, onDisconnect, publicClient } = useWallet();
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAgentActive, setIsAgentActive] = useState(true);
  const [portfolioValue, setPortfolioValue] = useState<PortfolioValue>({
    totalValueInS: 0n,
    totalValueInUsd: 0,
    tokenBalances: {},
  });

  const resetState = useCallback(() => {
    setVaultStatus(null);
    setIsLoading(false);
    setIsAgentActive(false);
    setPortfolioValue({
      totalValueInS: 0n,
      totalValueInUsd: 0,
      tokenBalances: {},
    });
  }, []);

  useEffect(() => {
    onDisconnect(resetState);
  }, [onDisconnect, resetState]);

  const fetchTokenBalances = useCallback(
    async (vaultAddress: `0x${string}`) => {
      if (!publicClient) {
        return;
      }

      const fetchTokenPrices = async (
        chainId: string,
        tokenAddresses: string[],
      ) => {
        try {
          const response = await fetch(
            `${clientEnv.NEXT_PUBLIC_API_URL}/tokens/prices`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ chainId, tokenAddresses }),
            },
          );

          if (!response.ok) {
            throw new Error('Failed to fetch token prices');
          }

          const data = await response.json();
          return data.prices as Record<string, TokenPrice | undefined>;
        } catch (error) {
          console.error('Error fetching token prices:', error);
          toast.error('Failed to fetch token prices');
          return null;
        }
      };

      try {
        // Fetch token prices first
        const tokenAddresses = SUPPORTED_TOKENS.map((token) => token.address);
        const prices = await fetchTokenPrices('sonic', tokenAddresses);

        if (!prices) {
          throw new Error('Failed to fetch token prices');
        }

        // Get S token price in USD as the base price
        const nativeTokenPrice = prices[SUPPORTED_TOKENS[0].address]; // Assuming first token is native S
        if (!nativeTokenPrice) {
          throw new Error('Failed to fetch S token price');
        }
        const sTokenUsdPrice = Number(nativeTokenPrice.priceUsd);

        // Initialize token balances
        const tokenBalances: PortfolioValue['tokenBalances'] = {};

        // Fetch native S balance first
        const nativeBalance = await publicClient.getBalance({
          address: vaultAddress,
        });

        // Calculate native S values
        const nativeBalanceInDecimals = Number(nativeBalance) / 1e18;
        const nativeValueInUsd = nativeBalanceInDecimals * sTokenUsdPrice;
        const nativeValueInS = nativeBalance; // Keep original balance precision for native S

        // Add native S to token balances
        tokenBalances[NATIVE_TOKEN_KEY] = {
          balance: nativeBalance,
          valueInS: nativeValueInS,
          valueInUsd: nativeValueInUsd,
          symbol: 'Native S',
        };

        // Fetch all supported token balances
        const balances = await Promise.all(
          SUPPORTED_TOKENS.map(async (token) => {
            try {
              const balance = await publicClient.readContract({
                address: token.address as `0x${string}`,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [vaultAddress],
              });

              const tokenPrice = prices[token.address];
              if (!tokenPrice) {
                return {
                  address: token.address,
                  balance,
                  valueInS: 0n,
                  valueInUsd: 0,
                  symbol: token.symbol,
                };
              }

              // Convert balance to a decimal number for price calculations
              const balanceInDecimals = Number(balance) / 10 ** token.decimals;

              // Calculate USD value first
              const valueInUsd =
                balanceInDecimals * Number(tokenPrice.priceUsd);

              // Calculate value in S by dividing USD value by S's USD price
              const valueInSNumber = valueInUsd / sTokenUsdPrice;
              const valueInS = BigInt(valueInSNumber * 1e18);

              return {
                address: token.address,
                balance,
                valueInS,
                valueInUsd,
                symbol: token.symbol,
              };
            } catch (error) {
              console.error(
                `Error fetching balance for ${token.symbol}:`,
                error,
              );
              return {
                address: token.address,
                balance: 0n,
                valueInS: 0n,
                valueInUsd: 0,
                symbol: token.symbol,
              };
            }
          }),
        );

        // Add supported token balances
        for (const {
          address,
          balance,
          valueInS,
          valueInUsd,
          symbol,
        } of balances) {
          if (balance > 0n) {
            // Only add tokens with non-zero balance
            tokenBalances[address] = { balance, valueInS, valueInUsd, symbol };
          }
        }

        // Calculate total values (starting with native S values)
        const totalValueInS = Object.values(tokenBalances).reduce(
          (acc, { valueInS }) => acc + valueInS,
          0n,
        );

        const totalValueInUsd = Object.values(tokenBalances).reduce(
          (acc, { valueInUsd }) => acc + valueInUsd,
          0,
        );

        setPortfolioValue({
          totalValueInS,
          totalValueInUsd,
          tokenBalances,
        });
      } catch (error) {
        console.error('Error fetching token balances:', error);
        toast.error('Failed to fetch token balances');
      }
    },
    [publicClient],
  );

  const checkVaultStatus = useCallback(async () => {
    if (!address) {
      setIsLoading(false);
      setVaultStatus(null);
      return;
    }

    try {
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
      setVaultStatus({
        exists: data.exists,
        vaultAddress: data.vaultAddress as `0x${string}`,
        balance: data.balance,
      });

      if (data.exists && data.vaultAddress) {
        await fetchTokenBalances(data.vaultAddress);
      }
    } catch (error) {
      console.error('Error checking vault status:', error);
      toast.error('Failed to check vault status');
    } finally {
      setIsLoading(false);
    }
  }, [address, fetchTokenBalances]);

  useEffect(() => {
    checkVaultStatus();
  }, [checkVaultStatus]);

  const formatBalance = (balance: string | undefined, isUsd = false) => {
    if (!balance) {
      return '0.00';
    }
    // Convert balance from wei (18 decimals) to S or USD
    const balanceNumber = isUsd
      ? Number(balance)
      : Number(BigInt(balance)) / 1e18;
    // Format with 2 decimal places for USD, 3 for S
    return balanceNumber.toLocaleString('en-US', {
      minimumFractionDigits: isUsd ? 2 : 3,
      maximumFractionDigits: isUsd ? 2 : 3,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <div className="p-6 pb-2 bg-muted/50">
          <h2 className="text-2xl font-semibold">Vault Value</h2>
        </div>
        <div className="h-[1px] mx-6 bg-border" />
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!vaultStatus?.exists || !vaultStatus?.vaultAddress) {
    return (
      <Card>
        <div className="p-6 pb-2 bg-muted/50">
          <h2 className="text-2xl font-semibold">Vault Value</h2>
        </div>
        <div className="h-[1px] mx-6 bg-border" />
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-6">
            <p className="text-sm text-muted-foreground">No vault found</p>
            <CreateVaultDialog onVaultCreated={checkVaultStatus} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <div className="px-6 py-4 mb-4 bg-muted/50">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Vault Value</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Agent Status</span>
            <button
              type="button"
              className={`w-2 h-2 rounded-full ${
                isAgentActive
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-gray-400 hover:bg-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors`}
              title={isAgentActive ? 'Stop agent' : 'Start agent'}
              onClick={() => {
                setIsAgentActive(!isAgentActive);
                toast.success(
                  isAgentActive ? 'Agent stopped' : 'Agent started',
                );
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsAgentActive(!isAgentActive);
                  toast.success(
                    isAgentActive ? 'Agent stopped' : 'Agent started',
                  );
                }
              }}
            />
          </div>
        </div>
      </div>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-4xl font-bold">
                $
                {formatBalance(portfolioValue.totalValueInUsd.toString(), true)}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <img
                  src="/assets/sonic-logo.png"
                  alt="Sonic"
                  className="w-8 h-8 rounded-full bg-black"
                />
                <div>
                  <div className="text-sm">
                    {formatBalance(portfolioValue.totalValueInS.toString())} S
                    ($
                    {formatBalance(
                      portfolioValue.totalValueInUsd.toString(),
                      true,
                    )}
                    )
                  </div>
                  <div className="text-sm text-muted-foreground">Sonic</div>
                </div>
              </div>
            </div>
            <div>
              <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-500">
                +21%
              </span>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-end mb-2">
            <button
              type="button"
              className="text-sm underline hover:no-underline"
              onClick={() => {
                const portfolioDialog = document.querySelector(
                  '[data-trigger="portfolio"]',
                ) as HTMLButtonElement;
                portfolioDialog?.click();
              }}
            >
              View All
            </button>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Button
                variant="default"
                className="w-full bg-green-500 hover:bg-green-600"
                onClick={() => {
                  const depositDialog = document.querySelector(
                    '[data-trigger="deposit"]',
                  ) as HTMLButtonElement;
                  depositDialog?.click();
                }}
              >
                fund
              </Button>
              <DepositDialog
                address={address as `0x${string}`}
                vaultAddress={vaultStatus.vaultAddress}
                onDepositSuccess={checkVaultStatus}
                triggerProps={
                  {
                    className: 'hidden',
                    'data-trigger': 'deposit',
                  } as { className: string; 'data-trigger': string }
                }
              />
            </div>
            <div className="flex-1">
              <WithdrawDialog
                address={address as `0x${string}`}
                vaultAddress={vaultStatus.vaultAddress}
                maxAmount={vaultStatus.balance}
                onWithdrawSuccess={checkVaultStatus}
              />
            </div>
          </div>
        </div>
        <PortfolioDialog
          tokenBalances={portfolioValue.tokenBalances}
          totalValueInS={portfolioValue.totalValueInS}
          totalValueInUsd={portfolioValue.totalValueInUsd}
          triggerProps={
            {
              className: 'hidden',
              'data-trigger': 'portfolio',
            } as { className: string; 'data-trigger': string }
          }
        />
      </CardContent>
    </Card>
  );
}
