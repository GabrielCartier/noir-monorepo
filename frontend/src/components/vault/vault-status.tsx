'use client';

import { Button } from '@/src/components/ui/button';
import { clientEnv } from '@/src/lib/config/client-env';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { WalletClient } from 'viem';
import { withdrawFromVault } from '../../lib/services/vault-service';
import { createCustomWalletClient } from '../../lib/web3/viem-client';
import type { VaultStatus } from '../../types/vault';
import { useWallet } from '../providers/wallet-provider';
import { CreateVaultDialog } from './create-vault-dialog';
import { DepositDialog } from './deposit-dialog';

export function VaultStatusComponent() {
  const { address, publicClient } = useWallet();
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);

  useEffect(() => {
    setWalletClient(createCustomWalletClient());
  }, []);

  useEffect(() => {
    if (address) {
      checkVaultStatus();
    } else {
      setIsLoading(false);
    }
  }, [address]);

  const checkVaultStatus = useCallback(async () => {
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

  const handleWithdraw = useCallback(async () => {
    if (!address || !vaultStatus?.vaultAddress || !walletClient) {
      toast.error('Wallet must be connected and vault must exist');
      return;
    }

    setIsWithdrawing(true);
    try {
      await withdrawFromVault({
        address: address as `0x${string}`,
        vaultAddress: vaultStatus.vaultAddress as `0x${string}`,
        publicClient,
        walletClient,
      });
      toast.success('Withdrawal successful');
      checkVaultStatus();
    } catch (error) {
      console.error('Error withdrawing:', error);
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          toast.error('Transaction rejected by user');
        } else if (error.message.includes('insufficient funds')) {
          toast.error('Insufficient funds for gas');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error('Failed to withdraw');
      }
    } finally {
      setIsWithdrawing(false);
    }
  }, [
    address,
    vaultStatus?.vaultAddress,
    walletClient,
    publicClient,
    checkVaultStatus,
  ]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!vaultStatus?.exists) {
    return (
      <div className="flex items-center gap-4">
        <CreateVaultDialog onVaultCreated={checkVaultStatus} />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Vault:{' '}
            <code className="bg-muted px-1 py-0.5 rounded">
              {(vaultStatus.vaultAddress as string).slice(0, 6)}...
              {(vaultStatus.vaultAddress as string).slice(-4)}
            </code>
          </p>
          <p className="text-sm text-muted-foreground">
            Balance: {vaultStatus.balance || '0'} S
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <DepositDialog
          address={address as `0x${string}`}
          vaultAddress={vaultStatus.vaultAddress as `0x${string}`}
          onDepositSuccess={checkVaultStatus}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleWithdraw}
          disabled={isWithdrawing || !vaultStatus.balance}
        >
          {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
        </Button>
      </div>
    </div>
  );
}
