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
import { wrappedSonicAbi } from '../../lib/constants/abis/wrapped-sonic-abi';
import {
  WRAPPED_SONIC_ADDRESS,
  depositToVault,
} from '../../lib/services/vault-service';
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
  const [wrappedBalance, setWrappedBalance] = useState<bigint | null>(null);
  const [hasWrappedTokens, setHasWrappedTokens] = useState(false);
  const { publicClient, ensureCorrectChain, walletClient } = useWallet();

  useEffect(() => {
    if (isOpen) {
      checkBalances();
    }
  }, [isOpen]);

  const checkBalances = async () => {
    try {
      // Check native S balance
      const nativeBalance = await publicClient.getBalance({
        address: address as `0x${string}`,
      });
      setBalance(nativeBalance);

      // Check wrapped S (wS) balance
      const wrappedBalance = await publicClient.readContract({
        address: WRAPPED_SONIC_ADDRESS as `0x${string}`,
        abi: wrappedSonicAbi,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      });
      setWrappedBalance(wrappedBalance);
      setHasWrappedTokens(wrappedBalance > 0n);
    } catch (error) {
      console.error('Error checking balances:', error);
      toast.error('Failed to check balances');
    }
  };

  const handleSendWrappedTokens = async () => {
    if (!walletClient || !wrappedBalance || wrappedBalance === 0n) {
      return;
    }

    setIsLoading(true);
    try {
      await ensureCorrectChain();

      // Send wrapped tokens to vault using withdrawTo
      const { request: withdrawRequest } = await publicClient.simulateContract({
        address: WRAPPED_SONIC_ADDRESS as `0x${string}`,
        abi: wrappedSonicAbi,
        functionName: 'withdrawTo',
        args: [vaultAddress as `0x${string}`, wrappedBalance],
        account: address as `0x${string}`,
      });

      const withdrawHash = await walletClient.writeContract({
        ...withdrawRequest,
        account: address as `0x${string}`,
      });

      await publicClient.waitForTransactionReceipt({ hash: withdrawHash });
      toast.success('Successfully sent wrapped tokens to vault');
      setHasWrappedTokens(false);
      onDepositSuccess();
    } catch (error) {
      console.error('Error sending wrapped tokens:', error);
      toast.error('Failed to send wrapped tokens to vault');
    } finally {
      setIsLoading(false);
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

      toast.info(
        'Please sign two transactions: first to wrap S tokens, then to send them to vault',
      );

      await depositToVault({
        address,
        vaultAddress,
        publicClient,
        walletClient,
        amount: amountInWei,
      });

      toast.success('Successfully deposited S tokens to vault');
      setIsOpen(false);
      onDepositSuccess();

      // Refresh balances after successful deposit
      checkBalances();
    } catch (error) {
      console.error('Error depositing:', error);
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          toast.error('Transaction rejected by user');
        } else if (error.message.includes('insufficient funds')) {
          toast.error('Insufficient funds for gas');
        } else if (error.message.includes('chain')) {
          toast.error('Please switch to the Sonic network to continue');
        } else if (error.message.includes('ERC20WithdrawFailed')) {
          toast.error(
            'Failed to send tokens to vault. Your tokens are wrapped - you can try sending them separately.',
          );
          await checkBalances();
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
            vault. This requires two transactions: first to wrap your S tokens,
            then to send them to the vault.
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
          <div className="text-sm text-muted-foreground space-y-1">
            {balance !== null && (
              <p>Available S balance: {Number(balance) / 1e18} S</p>
            )}
            {wrappedBalance !== null && wrappedBalance > 0n && (
              <p>Wrapped S balance: {Number(wrappedBalance) / 1e18} wS</p>
            )}
          </div>
        </div>
        <DialogFooter className="flex flex-col gap-2">
          <Button onClick={handleDeposit} disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Deposit'}
          </Button>
          {hasWrappedTokens && (
            <Button
              onClick={handleSendWrappedTokens}
              variant="secondary"
              disabled={isLoading}
            >
              Send Wrapped Tokens to Vault
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
