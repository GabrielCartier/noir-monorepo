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
import type { TokenValue } from '@/src/hooks/use-user-vault';
import { useState } from 'react';
import type { Address } from 'viem';

interface PortfolioDialogProps {
  tokenBalances: Record<Address, TokenValue>;
  totalValueInS: bigint;
  totalValueInUsd: string;
  triggerProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}

export function PortfolioDialog({
  tokenBalances,
  totalValueInUsd,
  triggerProps,
}: PortfolioDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

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
            </div>
            <div className="text-right text-sm text-muted-foreground">
              ≈ {totalValueInUsd}
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead className="text-right">Value in USD</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.values(tokenBalances).map((tokenValue) => (
                <TableRow key={tokenValue.symbol}>
                  <TableCell className="font-medium">
                    {tokenValue.name} ({tokenValue.symbol})
                  </TableCell>
                  <TableCell>{tokenValue.balanceFormatted}</TableCell>
                  <TableCell className="text-right">
                    {tokenValue.valueUsdFormatted}
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
