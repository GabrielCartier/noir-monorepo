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
import { useState } from 'react';
import { toast } from 'sonner';
import { withdrawFromVault } from '../../lib/services/vault-service';
import type { WithdrawDialogProps } from '../../types/vault';
import { useWallet } from '../providers/wallet-provider';

export function WithdrawDialog({
  address,
  vaultAddress,
  maxAmount,
  onWithdrawSuccess,
}: Omit<WithdrawDialogProps, 'publicClient' | 'walletClient'>) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const { ensureCorrectChain } = useWallet();

  const handleWithdraw = async () => {
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      // Ensure we're on the correct chain
      await ensureCorrectChain();

      // Convert amount to wei (18 decimals)
      const amountInWei = BigInt(Math.floor(Number(amount) * 1e18));

      // Check if amount is within available balance
      const maxAmountBigInt = BigInt(maxAmount || '0');
      if (amountInWei > maxAmountBigInt) {
        toast.error(
          `Insufficient vault balance. You have ${Number(maxAmountBigInt) / 1e18} S, but tried to withdraw ${amount} S`,
        );
        return;
      }

      await withdrawFromVault({
        address,
        vaultAddress,
        amount: amountInWei,
      });

      toast.success('Withdrawal request submitted successfully');
      setIsOpen(false);
      onWithdrawSuccess();
    } catch (error) {
      console.error('Error withdrawing:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to withdraw');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild={true}>
        <Button variant="outline" className="w-full">
          Withdraw
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw Sonic Tokens</DialogTitle>
          <DialogDescription>
            Enter the amount of Sonic tokens you want to withdraw from your
            vault. The withdrawal will be processed by the vault and sent to
            your wallet.
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
          {maxAmount && (
            <p className="text-sm text-muted-foreground">
              Available balance: {Number(BigInt(maxAmount)) / 1e18} S
            </p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleWithdraw} disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Withdraw'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
