'use client';

import { useWallet } from '@/src/components/providers/wallet-provider';
import { Button } from '@/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/src/components/ui/dialog';
import { getWalletUUID } from '@/src/utils/uuid';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  checkVaultStatus,
  createVault,
} from '../../lib/services/vault-service';
import type { VaultInfo } from '../../types/vault';
import { WalletConnectButton } from '../wallet/wallet-connect-button';

interface CreateVaultDialogProps {
  onVaultCreated?: () => void;
}

export function CreateVaultDialog({ onVaultCreated }: CreateVaultDialogProps) {
  const { address } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null);
  const [existingVault, setExistingVault] = useState<{
    address: string;
  } | null>(null);

  useEffect(() => {
    const checkExistingVault = async () => {
      if (!address) {
        return;
      }

      try {
        const status = await checkVaultStatus(address);
        if (status.exists && status.vaultAddress) {
          setExistingVault({
            address: status.vaultAddress as `0x${string}`,
          });
        }
      } catch (error) {
        console.error('Error checking existing vault:', error);
        toast.error('Failed to check existing vault');
      }
    };

    checkExistingVault();
  }, [address]);

  const handleCreateVault = async () => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    try {
      const info = await createVault(address, getWalletUUID(address));
      setVaultInfo(info);
      toast.success('Vault created successfully!');
      onVaultCreated?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create vault',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setVaultInfo(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild={true}>
        {address && <Button variant="outline">Create Vault</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Your Vault</DialogTitle>
          <DialogDescription>
            Create a new vault to store and manage your assets securely.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {address ? (
            <>
              {!existingVault && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Your vault will be created for address:{' '}
                    <code className="bg-muted px-1 py-0.5 rounded">
                      {address
                        ? `${address.slice(0, 6)}...${address.slice(-4)}`
                        : 'Loading...'}
                    </code>
                  </p>
                  {vaultInfo && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium">
                        Vault Created Successfully!
                      </p>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Vault Address:{' '}
                          <code className="bg-muted px-1 py-0.5 rounded">
                            {vaultInfo.address
                              ? `${vaultInfo.address.slice(0, 6)}...${vaultInfo.address.slice(-4)}`
                              : 'N/A'}
                          </code>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Transaction:{' '}
                          <code className="bg-muted px-1 py-0.5 rounded">
                            {vaultInfo.transactionHash
                              ? `${vaultInfo.transactionHash.slice(0, 6)}...${vaultInfo.transactionHash.slice(-4)}`
                              : 'N/A'}
                          </code>
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
              {existingVault && !vaultInfo && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Existing Vault Found</p>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Vault Address:{' '}
                      <code className="bg-muted px-1 py-0.5 rounded">
                        {existingVault?.address
                          ? `${existingVault.address.slice(0, 6)}...${existingVault.address.slice(-4)}`
                          : 'N/A'}
                      </code>
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Please connect your wallet to create a vault
              </p>
              <WalletConnectButton />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleClose} variant="outline">
            {vaultInfo ? 'Close' : 'Cancel'}
          </Button>
          {!vaultInfo && address && !existingVault && (
            <Button onClick={handleCreateVault} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Vault'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
