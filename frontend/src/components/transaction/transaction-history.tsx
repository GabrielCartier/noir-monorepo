'use client';

import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { ExternalLink } from 'lucide-react';

interface Transaction {
  id: string;
  from: string;
  to: string;
  timestamp: string;
}

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    from: 'Gabey.eth',
    to: 'Vault 1',
    timestamp: 'Feb 28th, 11:00 am',
  },
  {
    id: '2',
    from: 'Gabey.eth',
    to: 'Vault 1',
    timestamp: 'Feb 28th, 11:00 am',
  },
  {
    id: '3',
    from: 'Gabey.eth',
    to: 'Vault 1',
    timestamp: 'Feb 28th, 11:00 am',
  },
  {
    id: '4',
    from: 'Gabey.eth',
    to: 'Vault 1',
    timestamp: 'Feb 28th, 11:00 am',
  },
];

export function TransactionHistory() {
  return (
    <Card>
      <div className="px-6 py-4 mb-4 bg-muted/50">
        <h2 className="text-2xl font-semibold">Transaction History</h2>
      </div>
      <div className="h-[1px] mx-6 bg-border" />
      <CardContent className="space-y-4">
        {MOCK_TRANSACTIONS.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
          >
            <div className="space-y-1">
              <p className="text-sm">
                From {tx.from} to {tx.to}
              </p>
              <p className="text-xs text-muted-foreground">{tx.timestamp}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="ghost" className="w-full text-xs">
          View All
        </Button>
      </CardContent>
    </Card>
  );
}
