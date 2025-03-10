'use client';

import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { useCheckVaultStatus } from '@/src/hooks/use-check-vault-status';
import { useUserVault } from '@/src/hooks/use-user-vault';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAccount } from 'wagmi';
import { CreateVaultDialog } from './create-vault-dialog';
import { DepositDialog } from './deposit-dialog';
import { PortfolioDialog } from './portfolio-dialog';
import { WithdrawDialog } from './withdraw-dialog';

export function VaultValue() {
  const { address } = useAccount();
  const { data: vaultStatus } = useCheckVaultStatus();
  const {
    tokens,
    totalValueUsdFormatted,
    totalValueNativeFormatted,
    totalValueNative,
    isLoading,
    refetch,
  } = useUserVault();
  const [isAgentActive, setIsAgentActive] = useState(true);

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
            <CreateVaultDialog onVaultCreated={refetch} />
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
              <div className="text-4xl font-bold">{totalValueUsdFormatted}</div>
              <div className="flex items-center gap-2 mt-2">
                <img
                  src="/assets/sonic-logo.png"
                  alt="Sonic"
                  className="w-8 h-8 rounded-full bg-black"
                />
                <div>
                  <div className="text-sm">
                    {totalValueNative} S ({totalValueNativeFormatted})
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
                onDepositSuccess={refetch}
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
                onWithdrawSuccess={refetch}
              />
            </div>
          </div>
        </div>
        <PortfolioDialog
          tokenBalances={tokens}
          totalValueInUsd={totalValueUsdFormatted}
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
