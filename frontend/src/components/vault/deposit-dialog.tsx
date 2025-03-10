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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/src/components/ui/tabs';
import { useCheckBalance } from '@/src/hooks/use-check-balance';
import { useVaultBalance } from '@/src/hooks/use-vault-balance';
import { SUPPORTED_TOKENS } from '@/src/lib/constants/supported-tokens';
import { useState } from 'react';
import { toast } from 'sonner';
import { parseEther } from 'viem';
import { transferToken } from '../../lib/services/transfer-service';
import { depositForVault } from '../../lib/services/vault-service';
import { SONIC } from '../../lib/services/vault-service';
import type { Token } from '../../types/token';
import type { DepositDialogProps as BaseDepositDialogProps } from '../../types/vault';

interface DepositDialogProps
  extends Omit<BaseDepositDialogProps, 'publicClient' | 'walletClient'> {
  triggerProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}

export function DepositDialog({
  address,
  vaultAddress,
  onDepositSuccess,
  triggerProps,
}: DepositDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<Token>(SONIC);
  const nativeBalance = useCheckBalance();
  const { data: tokenBalances } = useVaultBalance(address);

  const handleDirectDeposit = async () => {
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!nativeBalance) {
      return;
    }
    setIsLoading(true);
    try {
      const amountInWei = parseEther(amount);

      // Check if user has sufficient native balance
      if (nativeBalance.value < amountInWei) {
        toast.error(
          `Insufficient S balance. You have ${nativeBalance.formatted} S, but need ${amount} S`,
        );
        return;
      }

      await depositForVault({
        address,
        vaultAddress,
        amount: amountInWei,
      });

      toast.success('Successfully deposited S tokens to vault');
      setIsOpen(false);
      onDepositSuccess();
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

  const handleTokenTransfer = async () => {
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      const amountInWei = BigInt(Math.floor(Number(amount) * 1e18));

      // Check if user has sufficient balance
      const tokenBalance = tokenBalances[selectedToken.address];
      if (tokenBalance && tokenBalance < amountInWei) {
        toast.error(
          `Insufficient ${selectedToken.symbol} balance. You have ${Number(tokenBalance) / 1e18} ${selectedToken.symbol}, but need ${amount} ${selectedToken.symbol}`,
        );
        return;
      }

      await transferToken({
        token: selectedToken,
        amount: amountInWei,
        from: address,
        to: vaultAddress,
      });

      toast.success(
        `Successfully transferred ${selectedToken.symbol} tokens to vault`,
      );
      setIsOpen(false);
      onDepositSuccess();
    } catch (error) {
      console.error('Error transferring:', error);
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
        toast.error('Failed to transfer');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild={true}>
        <Button variant="outline" className="w-full" {...triggerProps}>
          Deposit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Deposit to Vault</DialogTitle>
          <DialogDescription>
            Choose how you want to deposit tokens into your vault.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="direct" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="direct">Direct Deposit</TabsTrigger>
            <TabsTrigger value="transfer">Token Transfer</TabsTrigger>
          </TabsList>
          <TabsContent value="direct">
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
              <div className="text-sm text-muted-foreground">
                <p>Available S balance: {nativeBalance?.formatted} S</p>
              </div>
              <DialogFooter>
                <Button onClick={handleDirectDeposit} disabled={isLoading}>
                  {isLoading ? 'Processing...' : 'Deposit S Tokens'}
                </Button>
              </DialogFooter>
            </div>
          </TabsContent>
          <TabsContent value="transfer">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="token">Token</Label>
                <Select
                  value={selectedToken.symbol}
                  onValueChange={(value) => {
                    const token = SUPPORTED_TOKENS.find(
                      (token) => token.symbol === value,
                    );
                    if (token && tokenBalances[token.address] > 0n) {
                      setSelectedToken(token);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select token" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {Object.entries(tokenBalances).map(([address, balance]) => (
                      <SelectItem key={address} value={address}>
                        {
                          SUPPORTED_TOKENS.find(
                            (token) => token.address === address,
                          )?.symbol
                        }{' '}
                        ({Number(balance) / 1e18} available)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount</Label>
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
              <DialogFooter>
                <Button onClick={handleTokenTransfer} disabled={isLoading}>
                  {isLoading
                    ? 'Processing...'
                    : `Transfer ${selectedToken.symbol}`}
                </Button>
              </DialogFooter>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
