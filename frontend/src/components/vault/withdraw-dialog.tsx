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
import { withdrawFromVault } from '@/src/lib/services/vault-service';
import { useState } from 'react';
import { toast } from 'sonner';
import { useWallet } from '../providers/wallet-provider';

interface WithdrawDialogProps {
  address: `0x${string}`;
  vaultAddress: `0x${string}`;
  maxAmount?: string;
  onWithdrawSuccess?: () => void;
  disabled?: boolean;
}

export function WithdrawDialog({
  address,
  vaultAddress,
  maxAmount,
  onWithdrawSuccess,
  disabled,
}: WithdrawDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { publicClient, ensureCorrectChain, walletClient } = useWallet();

  const handleWithdraw = async () => {
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

      // Check if amount is within available balance
      if (
        maxAmount &&
        BigInt(Math.floor(Number(maxAmount) * 1e18)) < amountInWei
      ) {
        toast.error(
          `Insufficient vault balance. You have ${maxAmount} S available to withdraw.`,
        );
        return;
      }

      await withdrawFromVault({
        address,
        vaultAddress,
        publicClient,
        walletClient,
        amount: amountInWei,
      });
      toast.success('Withdrawal successful');
      setIsOpen(false);
      onWithdrawSuccess?.();
    } catch (error) {
      console.error('Error withdrawing:', error);
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
        toast.error('Failed to withdraw');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild={true}>
        <Button
          variant="outline"
          className="w-full"
          disabled={disabled || !maxAmount}
        >
          Withdraw
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Withdraw from Vault</DialogTitle>
          <DialogDescription>
            Enter the amount you want to withdraw from your vault.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              max={maxAmount}
              min="0"
              step="0.000000000000000001"
            />
            {maxAmount && (
              <p className="text-sm text-muted-foreground">
                Available: {maxAmount} S
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleWithdraw}
            disabled={!amount || isLoading || Number(amount) <= 0}
          >
            {isLoading ? 'Withdrawing...' : 'Withdraw'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
