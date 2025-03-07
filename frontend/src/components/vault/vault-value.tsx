'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import { clientEnv } from '@/src/lib/config/client-env';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { VaultStatus } from '../../types/vault';
import { useWallet } from '../providers/wallet-provider';
import { CreateVaultDialog } from './create-vault-dialog';
import { DepositDialog } from './deposit-dialog';
import { WithdrawDialog } from './withdraw-dialog';

export function VaultValue() {
  const { address, onDisconnect } = useWallet();
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAgentActive, setIsAgentActive] = useState(true);

  const resetState = useCallback(() => {
    setVaultStatus(null);
    setIsLoading(false);
    setIsAgentActive(false);
  }, []);

  useEffect(() => {
    onDisconnect(resetState);
  }, [onDisconnect, resetState]);

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
    } catch (error) {
      console.error('Error checking vault status:', error);
      toast.error('Failed to check vault status');
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    checkVaultStatus();
  }, [checkVaultStatus]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Vault Value</CardTitle>
        </CardHeader>
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Vault Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-6">
            <p className="text-sm text-muted-foreground">No vault found</p>
            <CreateVaultDialog onVaultCreated={checkVaultStatus} />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { vaultAddress } = vaultStatus;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Vault Value</span>
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
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {vaultStatus.balance || '0'} S
            </span>
            <span className="ml-2 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-500">
              +21%
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Vault:{' '}
            <code className="bg-muted px-1 py-0.5 rounded">
              {vaultAddress.slice(0, 6)}...
              {vaultAddress.slice(-4)}
            </code>
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <DepositDialog
              address={address as `0x${string}`}
              vaultAddress={vaultAddress as `0x${string}`}
              onDepositSuccess={checkVaultStatus}
            />
          </div>
          <div className="flex-1">
            <WithdrawDialog
              address={address as `0x${string}`}
              vaultAddress={vaultAddress as `0x${string}`}
              maxAmount={vaultStatus.balance}
              onWithdrawSuccess={checkVaultStatus}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
