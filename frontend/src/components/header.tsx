'use client';

import { VaultStatusComponent } from '@/src/components/vault/vault-status';
import { WalletConnectButton } from '@/src/components/wallet/wallet-connect-button';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center">
          <h1 className="ml-8 text-2xl font-bold">ThrustAI</h1>
        </div>
        <div className="flex items-center gap-4">
          <VaultStatusComponent />
          <WalletConnectButton />
        </div>
      </div>
    </header>
  );
}
