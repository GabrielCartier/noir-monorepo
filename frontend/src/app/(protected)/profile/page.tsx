'use client';

import { useWallet } from '@/src/components/providers/wallet-provider';

export default function Profile() {
  const { address } = useWallet();

  if (!address) {
    return null; // Will redirect from layout
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      <div className="max-w-2xl">
        <div className="p-6 rounded-lg border bg-card">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <span className="text-2xl font-semibold text-muted-foreground">
                {address.slice(2, 4).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Wallet Address</h2>
              <p className="text-muted-foreground font-mono">
                {address.slice(0, 6)}...{address.slice(-4)}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-1">Settings</h3>
              <p className="text-muted-foreground">Coming soon...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
