'use client';

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
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { WalletClient } from 'viem';
import { erc20Abi } from 'viem';
import { SONIC, depositToVault } from '../../lib/services/vault-service';
import { createCustomWalletClient } from '../../lib/web3/viem-client';
import type { DepositDialogProps } from '../../types/vault';
import { useWallet } from '../providers/wallet-provider';

export function DepositDialog({
  address,
  vaultAddress,
  onDepositSuccess,
}: Omit<DepositDialogProps, 'publicClient' | 'walletClient'>) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState<bigint | null>(null);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const { publicClient } = useWallet();

  useEffect(() => {
    setWalletClient(createCustomWalletClient());
  }, []);

  useEffect(() => {
    if (isOpen) {
      checkBalance();
    }
  }, [isOpen]);

  const checkBalance = async () => {
    try {
      const balance = await publicClient.readContract({
        address: SONIC.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
      });
      setBalance(balance);
    } catch (error) {
      console.error('Error checking balance:', error);
      toast.error('Failed to check balance');
    }
  };

  const handleDeposit = async () => {
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!walletClient) {
      toast.error('Wallet client not initialized');
      return;
    }

    setIsLoading(true);
    try {
      // Convert amount to wei (18 decimals)
      const amountInWei = BigInt(Math.floor(Number(amount) * 1e18));

      // Check if user has sufficient balance
      if (balance && balance < amountInWei) {
        toast.error(
          `Insufficient Sonic token balance. You have ${balance.toString()} S, but need ${amountInWei.toString()} S`,
        );
        return;
      }

      await depositToVault({
        address,
        vaultAddress,
        publicClient,
        walletClient,
        amount: amountInWei,
      });

      toast.success('Deposit successful');
      setIsOpen(false);
      onDepositSuccess();
    } catch (error) {
      console.error('Error depositing:', error);
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          toast.error('Transaction rejected by user');
        } else if (error.message.includes('insufficient funds')) {
          toast.error('Insufficient funds for gas');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error('Failed to deposit');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild={true}>
        <Button variant="outline" size="sm">
          Deposit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deposit Sonic Tokens</DialogTitle>
          <DialogDescription>
            Enter the amount of Sonic tokens you want to deposit into your
            vault.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount (S)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.000000000000000001"
            />
          </div>
          {balance !== null && (
            <p className="text-sm text-muted-foreground">
              Available balance: {Number(balance) / 1e18} S
            </p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleDeposit} disabled={isLoading}>
            {isLoading ? 'Depositing...' : 'Deposit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
