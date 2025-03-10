'use client';

import { PortfolioChart } from '@/src/components/dashboard/portfolio-chart';
import { VaultValue } from '@/src/components/vault/vault-value';
import { useAccount } from 'wagmi';

export default function Dashboard() {
  const { address } = useAccount();

  if (!address) {
    return null; // Will redirect from layout
  }

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <VaultValue />
        </div>
        <div className="lg:col-span-2">
          <PortfolioChart />
        </div>
      </div>
    </div>
  );
}
