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
import { depositToVault } from '../../lib/services/vault-service';
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
  const { publicClient, ensureCorrectChain, walletClient } = useWallet();

  useEffect(() => {
    if (isOpen) {
      checkBalance();
    }
  }, [isOpen]);

  const checkBalance = async () => {
    try {
      const balance = await publicClient.getBalance({
        address: address as `0x${string}`,
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
      // Ensure we're on the correct chain
      await ensureCorrectChain();

      // Convert amount to wei (18 decimals)
      const amountInWei = BigInt(Math.floor(Number(amount) * 1e18));

      // Check if user has sufficient balance
      if (balance && balance < amountInWei) {
        toast.error(
          `Insufficient Sonic token balance. You have ${Number(balance) / 1e18} S, but need ${amount} S`,
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

      toast.success('Successfully wrapped S tokens and deposited to vault');
      setIsOpen(false);
      onDepositSuccess();

      // Refresh balance after successful deposit
      checkBalance();
    } catch (error) {
      console.error('Error depositing:', error);
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          toast.error('Transaction rejected by user');
        } else if (error.message.includes('insufficient funds')) {
          toast.error('Insufficient funds for gas');
        } else if (error.message.includes('chain')) {
          toast.error('Please switch to the Sonic network to continue');
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
        <Button variant="outline" className="w-full">
          Deposit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deposit Sonic Tokens</DialogTitle>
          <DialogDescription>
            Enter the amount of Sonic tokens you want to deposit into your
            vault. Your native S tokens will be automatically wrapped into wS
            and deposited.
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
