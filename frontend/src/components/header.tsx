'use client';

import { ConnectButton } from '@/src/components/connect-button';
import { CreateVaultDialog } from '@/src/components/vault/create-vault-dialog';
import type { VaultInfo } from '@/src/lib/services/vault-service';
import { getVaultDetails } from '@/src/lib/services/vault-service';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

export function Header() {
  const { address, isConnected } = useAccount();
  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchVaultInfo() {
      if (!address) {
        return;
      }

      setIsLoading(true);

      try {
        const info = await getVaultDetails(address);
        console.log('Vault info received:', info);
        setVaultInfo(info);
      } catch (error) {
        console.error('Error fetching vault info:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (isConnected) {
      fetchVaultInfo();
    } else {
      setVaultInfo(null);
    }
  }, [address, isConnected]);

  const renderVaultStatus = () => {
    if (!isConnected) {
      return null;
    }

    if (isLoading) {
      return (
        <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md animate-pulse">
          <span className="text-sm text-muted-foreground">
            Loading vault...
          </span>
        </div>
      );
    }

    if (!vaultInfo?.exists) {
      return <CreateVaultDialog />;
    }

    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md">
          <span className="text-sm text-muted-foreground">Vault:</span>
          <code className="text-sm font-medium">
            {vaultInfo.address?.slice(0, 6)}...{vaultInfo.address?.slice(-4)}
          </code>
        </div>
        <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md">
          <span className="text-sm text-muted-foreground">Balance:</span>
          <span className="text-sm font-medium">
            {vaultInfo.balance ? vaultInfo.balance.toString() : '0'} USDC
          </span>
        </div>
      </div>
    );
  };

  return (
    <header className="border-b">
      <div className="container mx-auto p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">DeFAI Chicken</h1>
        <div className="flex items-center gap-4">
          {renderVaultStatus()}
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
