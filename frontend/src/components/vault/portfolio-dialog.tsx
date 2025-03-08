'use client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/src/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table';
import { useState } from 'react';
import { formatUnits } from 'viem';
import { SUPPORTED_TOKENS } from '../../lib/constants/supported-tokens';

const NATIVE_TOKEN_KEY = 'native_s' as const;

interface TokenBalances {
  [address: string]: {
    balance: bigint;
    valueInS: bigint;
    valueInUsd: number;
    symbol: string;
  };
}

interface PortfolioDialogProps {
  tokenBalances: TokenBalances;
  totalValueInS: bigint;
  totalValueInUsd: number;
  triggerProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}

export function PortfolioDialog({
  tokenBalances,
  totalValueInS,
  totalValueInUsd,
  triggerProps,
}: PortfolioDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatBalance = (balance: bigint, decimals: number) => {
    const formatted = formatUnits(balance, decimals);
    return Number(formatted).toLocaleString('en-US', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  };

  const formatUsd = (value: number) => {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Get native S balance first
  const nativeS = tokenBalances[NATIVE_TOKEN_KEY];

  // Get all other token balances
  const otherTokens = SUPPORTED_TOKENS.map((token) => ({
    token,
    balance: tokenBalances[token.address],
  })).filter(({ balance }) => balance && balance.balance > 0n);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild={true}>
        <button type="button" {...triggerProps}>
          View All
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Vault Portfolio</DialogTitle>
          <DialogDescription>
            Detailed breakdown of all tokens in your vault
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <div className="mb-4 space-y-1">
            <div className="text-right">
              <span className="text-sm text-muted-foreground">
                Total Value:{' '}
              </span>
              <span className="text-lg font-bold">
                {formatBalance(totalValueInS, 18)} S
              </span>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              ≈ {formatUsd(totalValueInUsd)}
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead className="text-right">Value in S</TableHead>
                <TableHead className="text-right">Value in USD</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Display native S first */}
              {nativeS && (
                <TableRow>
                  <TableCell className="font-medium">
                    {nativeS.symbol}
                  </TableCell>
                  <TableCell>{formatBalance(nativeS.balance, 18)}</TableCell>
                  <TableCell className="text-right">
                    {formatBalance(nativeS.valueInS, 18)} S
                  </TableCell>
                  <TableCell className="text-right">
                    {formatUsd(nativeS.valueInUsd)}
                  </TableCell>
                </TableRow>
              )}

              {/* Display other tokens */}
              {otherTokens.map(({ token, balance }) => (
                <TableRow key={token.address}>
                  <TableCell className="font-medium">
                    {token.name} ({token.symbol})
                  </TableCell>
                  <TableCell>
                    {formatBalance(balance.balance, token.decimals)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatBalance(balance.valueInS, 18)} S
                  </TableCell>
                  <TableCell className="text-right">
                    {formatUsd(balance.valueInUsd)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
