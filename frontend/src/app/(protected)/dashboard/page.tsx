'use client';

import { useWallet } from '@/src/components/providers/wallet-provider';

export default function Dashboard() {
  const { address } = useWallet();

  if (!address) {
    return null; // Will redirect from layout
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Dashboard content will go here */}
        <div className="p-6 rounded-lg border bg-card">
          <h2 className="text-lg font-semibold mb-2">Portfolio Overview</h2>
          <p className="text-muted-foreground">Coming soon...</p>
        </div>
      </div>
    </div>
  );
}
